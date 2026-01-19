
from playwright.sync_api import sync_playwright
import time

def verify_daily_tools():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app (Port 5173 according to explicit start)
        page.goto("http://localhost:5173/")

        # Wait for app to load - Look for "The Great Sort" title instead of "Day 1" as Day 1 might not be visible in all modes
        # But Daily starts in Daily mode which usually has no "Level" header unless I check code.
        # Actually Daily Mode has "DAILY CHALLENGE" or similar text?
        # Let's wait for the Tool Belt which is key.
        page.wait_for_selector("button[title]", timeout=10000)

        # Take screenshot of the initial state (Daily Mode)
        page.screenshot(path="verification/step1_daily.png")
        print("Daily mode screenshot taken.")

        # Switch to Career Mode to verify it generates tools
        # Try finding button by role or text.
        page.get_by_role("button", name="CAREER").click()

        time.sleep(1) # Wait for state update
        page.screenshot(path="verification/step2_career.png")
        print("Career mode screenshot taken.")

        # Switch to Practice
        page.get_by_role("button", name="PRACTICE").click()
        time.sleep(1)

        # Take final screenshot
        page.screenshot(path="verification/step3_practice.png")
        print("Practice mode screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_daily_tools()
