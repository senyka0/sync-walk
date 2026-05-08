from typing import Literal

from pydantic import BaseModel, Field

FeedbackSource = Literal[
    "beta_banner",
    "player",
    "tour_complete",
    "demo_exit",
    "bug_report",
]


class FeedbackClientContext(BaseModel):
    visitor_id: str | None = None
    url: str | None = None
    user_agent: str | None = None
    browser_brands: str | None = None
    platform: str | None = None
    mobile: bool | None = None
    language: str | None = None
    viewport: str | None = None
    screen: str | None = None
    time_zone: str | None = None


class FeedbackRequest(BaseModel):
    source: FeedbackSource
    message: str | None = Field(default=None, max_length=4000)
    choice: str | None = Field(default=None, max_length=200)
    signal: str | None = Field(default=None, max_length=200)
    tour_id: str | None = Field(default=None, max_length=100)
    tour_title: str | None = Field(default=None, max_length=300)
    room_code: str | None = Field(default=None, max_length=50)
    vote: Literal["yes", "no"] | None = None
    client: FeedbackClientContext | None = None


class FeedbackResponse(BaseModel):
    ok: bool
