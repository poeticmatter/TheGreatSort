from playwright.sync_api import sync_playwright, expect

def verify_game_load(page):
    print("Navigating to app...")
    page.goto("http://localhost:3002/TheGreatSort/")

    # Wait for the game to load (title should be visible)
    print("Waiting for title...")
    title = page.get_by_text("The Great Sort")
    expect(title).to_be_visible()

    # Take initial screenshot
    print("Taking initial screenshot...")
    page.screenshot(path="verification/initial_load.png")

    # Wait for buttons (tools) to be visible to ensure game logic loaded
    print("Checking for tools...")
    # Tools are action buttons, usually have amber color or specific classes.
    # We can check for a specific tool text or just that buttons exist.
    # Based on memory, there is a "ToolBelt".

    # Let's try to start a game or just verify the "Day 1" or similar text if in Career mode
    # Or "Daily" if default. Memory says default is Daily.

    # Check for "Start" or "Sort" button if applicable?
    # The game usually starts in PLANNING phase. User interacts to sort.
    # There is a "Start Inspection" button? Memory says "SubmitButton".

    # Check for Start Inspection button
    start_btn = page.get_by_role("button", name="Start Inspection")
    if start_btn.is_visible():
        print("Start Inspection button found.")
        # Click it to trigger animation
        start_btn.click()

        # Wait a bit for animation to progress (it yields twice per card)
        page.wait_for_timeout(2000)

        print("Taking in-progress screenshot...")
        page.screenshot(path="verification/in_progress.png")

        # Wait for Results
        # Eventually it should show a score or "Results"
        page.wait_for_timeout(5000)
        print("Taking final screenshot...")
        page.screenshot(path="verification/final_result.png")
    else:
        print("Start Inspection button not found immediately. Checking mode...")
        # Maybe we need to wait for daily load?
        page.wait_for_timeout(1000)
        page.screenshot(path="verification/after_wait.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_game_load(page)
        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()
