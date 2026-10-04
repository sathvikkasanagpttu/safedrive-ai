import pytest
from app.ai.drowsiness import DrowsinessService
from app.ai.base import DrowsinessState

def test_drowsiness_state_transitions():
    service = DrowsinessService(
        ear_threshold=0.22,
        eyes_closing_frames=2,
        possible_drowsy_frames=5,
        confirmed_drowsy_frames=10,
        alert_drowsy_frames=15
    )

    # Initial state
    assert service.state == DrowsinessState.EYES_OPEN

    # 1. Closed for 1 frame -> EYES_OPEN (under 2 frames)
    state, dur, triggered = service.update(0.15, timestamp=1.0)
    assert state == DrowsinessState.EYES_OPEN

    # 2. Closed for 2 frames -> EYES_CLOSING
    state, dur, triggered = service.update(0.15, timestamp=1.1)
    assert state == DrowsinessState.EYES_CLOSING

    # 3. Closed up to 5 frames -> POSSIBLE_DROWSINESS
    for t in [1.2, 1.3, 1.4]:
        state, dur, triggered = service.update(0.15, timestamp=t)
    assert state == DrowsinessState.POSSIBLE_DROWSINESS

    # 4. Closed up to 10 frames -> DROWSINESS
    for t in [1.5, 1.6, 1.7, 1.8, 1.9]:
        state, dur, triggered = service.update(0.15, timestamp=t)
    assert state == DrowsinessState.DROWSINESS
    assert triggered is True

    # 5. Closed up to 15 frames -> ALERTED
    for t in [2.0, 2.1, 2.2, 2.3, 2.4]:
        state, dur, triggered = service.update(0.15, timestamp=t)
    assert state == DrowsinessState.ALERTED
    assert triggered is True

    # 6. Eyes reopen -> RECOVERED
    for t in [2.5, 2.6, 2.7, 2.8, 2.9]:
        state, dur, triggered = service.update(0.32, timestamp=t)
    assert state == DrowsinessState.RECOVERED

    # 7. Continued open -> EYES_OPEN
    for t in range(12):
        state, dur, triggered = service.update(0.32, timestamp=3.0 + t*0.1)
    assert state == DrowsinessState.EYES_OPEN
