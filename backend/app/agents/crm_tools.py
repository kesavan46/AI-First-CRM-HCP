"""
LangGraph CRM tools for medical rep interaction tracking.

Five tools, each decorated with @tool so LangGraph can bind them to the agent:

    1. log_interaction      — NL → LLM extraction → PostgreSQL insert
    2. edit_interaction     — Update an existing interaction by ID
    3. search_interactions  — Search by doctor name or date
    4. doctor_profile       — Full history + pending follow-ups for a doctor
    5. follow_up_reminders  — Upcoming follow-ups across all doctors

Design decisions
────────────────
- Every tool opens its own AsyncSession via AsyncSessionLocal so tools can
  be called standalone or from within a LangGraph agent loop.
- The LLM extraction in log_interaction uses a JSON-mode prompt; fallback
  values are applied for any field the model omits.
- All tools return plain strings so the agent can relay them back to the user
  without extra serialisation work.
- Dates are always stored and returned in UTC.
"""

from __future__ import annotations

import json
import logging
import re
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from langchain_core.messages import HumanMessage
from langchain_core.tools import tool
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import selectinload

from app.core.llm import get_llm_deterministic
from app.db.session import AsyncSessionLocal
from app.models.doctor import Doctor
from app.models.interaction import Interaction

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

_VALID_TYPES = {"visit", "call", "email", "conference", "virtual"}
_VALID_STATUSES = {"draft", "submitted", "reviewed"}


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    """Parse a YYYY-MM-DD or ISO-8601 string to a UTC-aware datetime."""
    if not value:
        return None
    match = re.search(r"\d{4}-\d{2}-\d{2}", str(value))
    if not match:
        return None
    try:
        return datetime.strptime(match.group(), "%Y-%m-%d").replace(
            tzinfo=timezone.utc
        )
    except ValueError:
        return None


async def _find_or_create_doctor(
    session,
    first_name: str,
    last_name: str,
    institution: Optional[str],
) -> Doctor:
    """
    Look up a doctor by name (case-insensitive). Create a stub record if
    no match is found so the interaction can always be stored.
    """
    result = await session.execute(
        select(Doctor).where(
            and_(
                func.lower(Doctor.first_name) == first_name.lower(),
                func.lower(Doctor.last_name) == last_name.lower(),
            )
        )
    )
    doctor = result.scalar_one_or_none()
    if doctor:
        return doctor

    # Auto-create a minimal doctor record from the extracted name
    doctor = Doctor(
        first_name=first_name.strip().title(),
        last_name=last_name.strip().title(),
        institution=institution,
    )
    session.add(doctor)
    await session.flush()
    logger.info("Auto-created doctor: %s %s", first_name, last_name)
    return doctor


# ─────────────────────────────────────────────────────────────────────────────
# Tool 1 — Log Interaction
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def log_interaction(natural_language_input: str) -> str:
    """
    Log a new doctor interaction from a natural language description.

    The LLM extracts:
        - Doctor first and last name
        - Hospital / institution name
        - Interaction type  (visit | call | email | conference | virtual)
        - Products discussed
        - Summary of the interaction
        - Follow-up date (YYYY-MM-DD)

    The extracted data is stored in the interactions table in PostgreSQL.
    A new Doctor record is created automatically if no matching doctor is found.

    Args:
        natural_language_input: Free-text description of the interaction
                                 written by the medical rep.

    Returns:
        Confirmation message with the new interaction ID, or an error string.

    Example:
        "Visited Dr. Priya Sharma at Apollo Hospital today. Discussed
         Cardivol 10mg. She was receptive. Follow up in two weeks."
    """
    # ── Step 1: LLM extraction ────────────────────────────────────────────────
    today = date.today().isoformat()
    extraction_prompt = f"""You are a medical CRM data-extraction assistant.
Today's date is {today}.

Extract the following fields from the interaction note below.
Return ONLY a valid JSON object — no markdown, no explanation.

Fields:
  "doctor_first_name"  : string  (first name of the doctor)
  "doctor_last_name"   : string  (last name / surname of the doctor)
  "institution"        : string or null  (hospital, clinic, or institution name)
  "interaction_type"   : one of "visit" | "call" | "email" | "conference" | "virtual"
  "products_discussed" : string or null  (product / drug name(s))
  "summary"            : string  (2-3 sentence summary of the interaction)
  "follow_up_date"     : string or null  (YYYY-MM-DD, null if not mentioned)

Rules:
  - If the doctor's last name is unclear, use "Unknown".
  - If the interaction type cannot be determined, default to "visit".
  - follow_up_date must be a future date relative to today ({today}).
  - Do NOT add any extra keys.

Interaction note:
\"\"\"{natural_language_input}\"\"\"
"""

    try:
        llm = get_llm_deterministic()
        response = await llm.ainvoke([HumanMessage(content=extraction_prompt)])
        raw_json = response.content.strip()

        # Strip markdown fences if the model added them
        raw_json = re.sub(r"^```(?:json)?\s*", "", raw_json)
        raw_json = re.sub(r"\s*```$", "", raw_json)

        extracted: dict = json.loads(raw_json)
    except (json.JSONDecodeError, Exception) as exc:
        logger.error("LLM extraction failed: %s", exc)
        return f"Error: could not extract interaction data from input. Details: {exc}"

    # ── Step 2: Validate / normalise extracted fields ─────────────────────────
    first_name: str = extracted.get("doctor_first_name", "Unknown").strip() or "Unknown"
    last_name: str = extracted.get("doctor_last_name", "Unknown").strip() or "Unknown"
    institution: Optional[str] = extracted.get("institution") or None
    interaction_type: str = extracted.get("interaction_type", "visit").lower()
    if interaction_type not in _VALID_TYPES:
        interaction_type = "visit"

    products: Optional[str] = extracted.get("products_discussed") or None
    summary: Optional[str] = extracted.get("summary") or None
    follow_up_date: Optional[datetime] = _parse_date(extracted.get("follow_up_date"))

    # ── Step 3: Persist to PostgreSQL ─────────────────────────────────────────
    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                doctor = await _find_or_create_doctor(
                    session, first_name, last_name, institution
                )

                interaction = Interaction(
                    doctor_id=doctor.id,
                    interaction_date=_utcnow(),
                    interaction_type=interaction_type,
                    product_discussed=products,
                    summary=summary,
                    notes=natural_language_input,
                    follow_up_date=follow_up_date,
                    status="draft",
                )
                session.add(interaction)
                await session.flush()
                interaction_id = str(interaction.id)

        # Build a readable confirmation
        follow_up_str = (
            follow_up_date.strftime("%Y-%m-%d") if follow_up_date else "not set"
        )
        return (
            f"✅ Interaction logged successfully.\n"
            f"  ID            : {interaction_id}\n"
            f"  Doctor        : Dr. {first_name} {last_name}"
            + (f" ({institution})" if institution else "") + "\n"
            f"  Type          : {interaction_type}\n"
            f"  Product       : {products or 'not specified'}\n"
            f"  Follow-up     : {follow_up_str}\n"
            f"  Summary       : {summary or 'not provided'}"
        )

    except Exception as exc:
        logger.error("DB write failed in log_interaction: %s", exc)
        return f"Error: failed to save interaction to database. Details: {exc}"


# ─────────────────────────────────────────────────────────────────────────────
# Tool 2 — Edit Interaction
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def edit_interaction(
    interaction_id: str,
    interaction_type: Optional[str] = None,
    products_discussed: Optional[str] = None,
    summary: Optional[str] = None,
    notes: Optional[str] = None,
    follow_up_date: Optional[str] = None,
    status: Optional[str] = None,
) -> str:
    """
    Update one or more fields of an existing interaction record.

    Only the fields you provide will be changed; all others remain untouched.

    Args:
        interaction_id:    UUID of the interaction to update (required).
        interaction_type:  New type — visit | call | email | conference | virtual.
        products_discussed: Name of the product discussed.
        summary:           Updated summary text.
        notes:             Updated free-text notes.
        follow_up_date:    New follow-up date in YYYY-MM-DD format.
        status:            New status — draft | submitted | reviewed.

    Returns:
        Confirmation message listing every field that was changed,
        or an error string if the interaction was not found.

    Example:
        edit_interaction(
            interaction_id="3f2c...",
            follow_up_date="2026-07-25",
            status="submitted"
        )
    """
    # Validate UUID
    try:
        iid = uuid.UUID(interaction_id)
    except ValueError:
        return f"Error: '{interaction_id}' is not a valid UUID."

    # Validate optional enum values up-front
    if interaction_type and interaction_type not in _VALID_TYPES:
        return (
            f"Error: interaction_type must be one of "
            f"{sorted(_VALID_TYPES)}. Got '{interaction_type}'."
        )
    if status and status not in _VALID_STATUSES:
        return (
            f"Error: status must be one of "
            f"{sorted(_VALID_STATUSES)}. Got '{status}'."
        )

    parsed_follow_up = _parse_date(follow_up_date)
    if follow_up_date and not parsed_follow_up:
        return f"Error: follow_up_date '{follow_up_date}' is not a valid date (expected YYYY-MM-DD)."

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                result = await session.execute(
                    select(Interaction).where(Interaction.id == iid)
                )
                interaction = result.scalar_one_or_none()
                if not interaction:
                    return f"Error: interaction '{interaction_id}' not found."

                changed: list[str] = []

                if interaction_type is not None:
                    interaction.interaction_type = interaction_type
                    changed.append(f"interaction_type → {interaction_type}")

                if products_discussed is not None:
                    interaction.product_discussed = products_discussed
                    changed.append(f"products_discussed → {products_discussed}")

                if summary is not None:
                    interaction.summary = summary
                    changed.append("summary updated")

                if notes is not None:
                    interaction.notes = notes
                    changed.append("notes updated")

                if parsed_follow_up is not None:
                    interaction.follow_up_date = parsed_follow_up
                    changed.append(
                        f"follow_up_date → {parsed_follow_up.strftime('%Y-%m-%d')}"
                    )

                if status is not None:
                    interaction.status = status
                    changed.append(f"status → {status}")

                if not changed:
                    return "No changes provided — interaction was not modified."

        changes_str = "\n  • ".join(changed)
        return (
            f"✅ Interaction '{interaction_id}' updated.\n"
            f"  Changes:\n  • {changes_str}"
        )

    except Exception as exc:
        logger.error("DB write failed in edit_interaction: %s", exc)
        return f"Error: failed to update interaction. Details: {exc}"



# ─────────────────────────────────────────────────────────────────────────────
# Tool 3 — Search Interactions
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def search_interactions(
    doctor_name: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    interaction_type: Optional[str] = None,
    limit: int = 10,
) -> str:
    """
    Search interaction records by doctor name and/or date range.

    At least one filter must be provided. Results are ordered by interaction
    date (most recent first) and capped at *limit* rows.

    Args:
        doctor_name:      Partial or full doctor name (first or last, case-insensitive).
        date_from:        Start date filter in YYYY-MM-DD format (inclusive).
        date_to:          End date filter in YYYY-MM-DD format (inclusive).
        interaction_type: Filter by type — visit | call | email | conference | virtual.
        limit:            Maximum number of results to return (default 10, max 50).

    Returns:
        Formatted list of matching interactions, or a message if none found.

    Example:
        search_interactions(doctor_name="Sharma", date_from="2026-07-01")
    """
    if not any([doctor_name, date_from, date_to, interaction_type]):
        return "Error: provide at least one search filter (doctor_name, date_from, date_to, or interaction_type)."

    limit = min(max(1, limit), 50)

    parsed_from = _parse_date(date_from)
    parsed_to = _parse_date(date_to)
    if date_from and not parsed_from:
        return f"Error: date_from '{date_from}' is not a valid date (expected YYYY-MM-DD)."
    if date_to and not parsed_to:
        return f"Error: date_to '{date_to}' is not a valid date (expected YYYY-MM-DD)."
    if interaction_type and interaction_type not in _VALID_TYPES:
        return f"Error: interaction_type must be one of {sorted(_VALID_TYPES)}."

    try:
        async with AsyncSessionLocal() as session:
            query = (
                select(Interaction)
                .options(selectinload(Interaction.doctor))
                .order_by(Interaction.interaction_date.desc())
                .limit(limit)
            )

            # ── Doctor name filter (join on Doctor table) ──────────────────────
            if doctor_name:
                term = f"%{doctor_name.strip()}%"
                query = query.join(Interaction.doctor).where(
                    or_(
                        Doctor.first_name.ilike(term),
                        Doctor.last_name.ilike(term),
                    )
                )

            # ── Date filters ───────────────────────────────────────────────────
            if parsed_from:
                query = query.where(Interaction.interaction_date >= parsed_from)
            if parsed_to:
                # Include the whole end day
                end_of_day = parsed_to.replace(
                    hour=23, minute=59, second=59, microsecond=999999
                )
                query = query.where(Interaction.interaction_date <= end_of_day)

            # ── Type filter ────────────────────────────────────────────────────
            if interaction_type:
                query = query.where(
                    Interaction.interaction_type == interaction_type
                )

            result = await session.execute(query)
            interactions = result.scalars().all()

        if not interactions:
            return "No interactions found matching the given filters."

        lines = [f"Found {len(interactions)} interaction(s):\n"]
        for i, interaction in enumerate(interactions, 1):
            doc = interaction.doctor
            doctor_str = (
                f"Dr. {doc.first_name} {doc.last_name}"
                if doc
                else f"Doctor ID {interaction.doctor_id}"
            )
            institution_str = (
                f" — {doc.institution}" if doc and doc.institution else ""
            )
            follow_up_str = (
                interaction.follow_up_date.strftime("%Y-%m-%d")
                if interaction.follow_up_date
                else "none"
            )
            lines.append(
                f"{i}. [{interaction.interaction_date.strftime('%Y-%m-%d')}] "
                f"{interaction.interaction_type.upper()} with "
                f"{doctor_str}{institution_str}\n"
                f"   ID: {interaction.id}\n"
                f"   Product : {interaction.product_discussed or 'not specified'}\n"
                f"   Status  : {interaction.status}\n"
                f"   Follow-up: {follow_up_str}\n"
                f"   Summary : {(interaction.summary or interaction.ai_summary or 'N/A')[:120]}"
            )

        return "\n".join(lines)

    except Exception as exc:
        logger.error("DB query failed in search_interactions: %s", exc)
        return f"Error: search failed. Details: {exc}"


# ─────────────────────────────────────────────────────────────────────────────
# Tool 4 — Doctor Profile
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def doctor_profile(doctor_name: str) -> str:
    """
    Return the full profile of a doctor including interaction history
    and all pending (future) follow-ups.

    Args:
        doctor_name: Partial or full doctor name (first or last, case-insensitive).
                     If multiple doctors match, the top 3 are listed and the user
                     is asked to be more specific.

    Returns:
        Formatted profile with doctor details, interaction history summary,
        and list of pending follow-up dates.

    Example:
        doctor_profile("Sharma")
    """
    if not doctor_name or not doctor_name.strip():
        return "Error: doctor_name is required."

    term = f"%{doctor_name.strip()}%"

    try:
        async with AsyncSessionLocal() as session:
            # ── Find matching doctors ──────────────────────────────────────────
            doc_result = await session.execute(
                select(Doctor).where(
                    or_(
                        Doctor.first_name.ilike(term),
                        Doctor.last_name.ilike(term),
                    )
                ).limit(5)
            )
            doctors = doc_result.scalars().all()

        if not doctors:
            return f"No doctor found matching '{doctor_name}'."

        if len(doctors) > 1:
            # Multiple matches — list them and ask user to narrow down
            matches = "\n".join(
                f"  • Dr. {d.first_name} {d.last_name}"
                + (f" ({d.institution})" if d.institution else "")
                + f" [ID: {d.id}]"
                for d in doctors[:3]
            )
            return (
                f"Multiple doctors match '{doctor_name}'. "
                f"Please be more specific:\n{matches}"
            )

        doctor = doctors[0]

        # ── Load interactions for this doctor ──────────────────────────────────
        async with AsyncSessionLocal() as session:
            int_result = await session.execute(
                select(Interaction)
                .where(Interaction.doctor_id == doctor.id)
                .order_by(Interaction.interaction_date.desc())
                .limit(50)
            )
            interactions = int_result.scalars().all()

        now = _utcnow()
        pending_followups = [
            i for i in interactions
            if i.follow_up_date and i.follow_up_date > now
        ]
        total = len(interactions)

        # ── Build profile output ───────────────────────────────────────────────
        lines: list[str] = [
            f"👤 Doctor Profile",
            f"  Name        : Dr. {doctor.first_name} {doctor.last_name}",
            f"  Specialty   : {doctor.specialty or 'N/A'}",
            f"  Designation : {doctor.designation or 'N/A'}",
            f"  Institution : {doctor.institution or 'N/A'}",
            f"  City/State  : {', '.join(filter(None, [doctor.city, doctor.state])) or 'N/A'}",
            f"  Email       : {doctor.email or 'N/A'}",
            f"  Phone       : {doctor.phone or 'N/A'}",
            f"",
            f"📋 Interaction History ({total} total)",
        ]

        if not interactions:
            lines.append("  No interactions recorded yet.")
        else:
            # Show latest 5 interactions
            for i, interaction in enumerate(interactions[:5], 1):
                follow_up_str = (
                    interaction.follow_up_date.strftime("%Y-%m-%d")
                    if interaction.follow_up_date
                    else "none"
                )
                sentiment_str = (
                    f" | Sentiment: {interaction.ai_sentiment}"
                    if interaction.ai_sentiment
                    else ""
                )
                lines.append(
                    f"  {i}. [{interaction.interaction_date.strftime('%Y-%m-%d')}] "
                    f"{interaction.interaction_type.upper()} — "
                    f"{interaction.product_discussed or 'no product'}"
                    f"{sentiment_str}\n"
                    f"     Status: {interaction.status} | Follow-up: {follow_up_str}\n"
                    f"     {(interaction.summary or interaction.ai_summary or 'No summary available')[:100]}"
                )
            if total > 5:
                lines.append(f"  … and {total - 5} older interaction(s).")

        # ── Pending follow-ups ─────────────────────────────────────────────────
        lines.append(f"\n📅 Pending Follow-ups ({len(pending_followups)})")
        if not pending_followups:
            lines.append("  No pending follow-ups.")
        else:
            for fu in sorted(pending_followups, key=lambda x: x.follow_up_date):
                days_left = (fu.follow_up_date.date() - now.date()).days
                urgency = "🔴" if days_left <= 3 else ("🟡" if days_left <= 7 else "🟢")
                lines.append(
                    f"  {urgency} {fu.follow_up_date.strftime('%Y-%m-%d')} "
                    f"(in {days_left} day{'s' if days_left != 1 else ''}) — "
                    f"{fu.interaction_type.upper()} | ID: {fu.id}"
                )

        return "\n".join(lines)

    except Exception as exc:
        logger.error("DB query failed in doctor_profile: %s", exc)
        return f"Error: could not load doctor profile. Details: {exc}"


# ─────────────────────────────────────────────────────────────────────────────
# Tool 5 — Follow-up Reminders
# ─────────────────────────────────────────────────────────────────────────────

@tool
async def follow_up_reminders(
    days_ahead: int = 7,
    doctor_name: Optional[str] = None,
) -> str:
    """
    Return all upcoming follow-up reminders within the next *days_ahead* days.

    Results are sorted by follow-up date (soonest first) and grouped by
    urgency: overdue, due today, due this week, and later.

    Args:
        days_ahead:  Look-ahead window in days (default 7, max 90).
        doctor_name: Optional doctor name filter (partial, case-insensitive).

    Returns:
        Formatted reminder list grouped by urgency, or a message if none found.

    Example:
        follow_up_reminders(days_ahead=14)
        follow_up_reminders(days_ahead=30, doctor_name="Mehta")
    """
    days_ahead = min(max(1, days_ahead), 90)

    try:
        async with AsyncSessionLocal() as session:
            now = _utcnow()
            window_end = now + timedelta(days=days_ahead)

            query = (
                select(Interaction)
                .options(selectinload(Interaction.doctor))
                .where(
                    and_(
                        Interaction.follow_up_date.isnot(None),
                        Interaction.follow_up_date <= window_end,
                    )
                )
                .order_by(Interaction.follow_up_date.asc())
            )

            # Optional doctor name filter
            if doctor_name:
                term = f"%{doctor_name.strip()}%"
                query = query.join(Interaction.doctor).where(
                    or_(
                        Doctor.first_name.ilike(term),
                        Doctor.last_name.ilike(term),
                    )
                )

            result = await session.execute(query)
            interactions = result.scalars().all()

        if not interactions:
            scope = f"'{doctor_name}'" if doctor_name else "any doctor"
            return (
                f"No follow-ups due in the next {days_ahead} day(s) for {scope}."
            )

        today = now.date()

        overdue:  list[Interaction] = []
        due_today: list[Interaction] = []
        upcoming: list[Interaction] = []

        for i in interactions:
            fu_date = i.follow_up_date.date()
            if fu_date < today:
                overdue.append(i)
            elif fu_date == today:
                due_today.append(i)
            else:
                upcoming.append(i)

        def _format_row(i: Interaction) -> str:
            doc = i.doctor
            doctor_str = (
                f"Dr. {doc.first_name} {doc.last_name}"
                if doc
                else f"Doctor ID {i.doctor_id}"
            )
            institution_str = (
                f" ({doc.institution})" if doc and doc.institution else ""
            )
            days_diff = (i.follow_up_date.date() - today).days
            if days_diff < 0:
                timing = f"{abs(days_diff)} day(s) overdue"
            elif days_diff == 0:
                timing = "TODAY"
            else:
                timing = f"in {days_diff} day(s)"

            return (
                f"  • {i.follow_up_date.strftime('%Y-%m-%d')} [{timing}] — "
                f"{doctor_str}{institution_str}\n"
                f"    Type: {i.interaction_type.upper()} | "
                f"Product: {i.product_discussed or 'N/A'} | "
                f"Status: {i.status}\n"
                f"    ID: {i.id}"
            )

        lines: list[str] = [
            f"📆 Follow-up Reminders (next {days_ahead} day(s))\n"
            f"   Total: {len(interactions)} reminder(s)\n"
        ]

        if overdue:
            lines.append(f"🔴 OVERDUE ({len(overdue)})")
            lines.extend(_format_row(i) for i in overdue)
            lines.append("")

        if due_today:
            lines.append(f"🟠 DUE TODAY ({len(due_today)})")
            lines.extend(_format_row(i) for i in due_today)
            lines.append("")

        if upcoming:
            lines.append(f"🟢 UPCOMING ({len(upcoming)})")
            lines.extend(_format_row(i) for i in upcoming)

        return "\n".join(lines)

    except Exception as exc:
        logger.error("DB query failed in follow_up_reminders: %s", exc)
        return f"Error: could not retrieve follow-up reminders. Details: {exc}"
