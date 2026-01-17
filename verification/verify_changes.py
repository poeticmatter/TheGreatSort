
from playwright.sync_api import sync_playwright

def verify_changes():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # 1. Navigate to the app (using port 3000 as per log)
        page.goto("http://localhost:3000/TheGreatSort/")

        # Wait for app to load
        page.wait_for_selector("h1")

        # 2. Check Daily Mode (Default)
        # Should NOT see "Quota Level" or "Current Yield" in Header
        page.screenshot(path="verification/step1_daily.png")
        print("Daily mode screenshot taken.")

        # 3. Change to Career Mode to check Header Stats
        # Click Mode button -> Career
        page.get_by_role("button", name="Mode:").click()
        page.get_by_role("button", name="CAREER").click()

        # Wait for Career mode
        # Header should now show "Day" and "Overall Eff."
        # Use simple text matching
        page.wait_for_selector("text=Day")
        page.wait_for_selector("text=Overall Eff.")

        page.screenshot(path="verification/step2_career.png")
        print("Career mode screenshot taken.")

        # 4. Check Action Buttons styling
        footer = page.locator("footer")
        footer.screenshot(path="verification/step4_footer.png")
        print("Footer screenshot taken.")

        browser.close()

if __name__ == "__main__":
    verify_changes()
