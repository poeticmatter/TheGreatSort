from playwright.sync_api import sync_playwright

def verify_ui():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            page.goto("http://localhost:3000/TheGreatSort/")

            # Wait for the app to load
            page.wait_for_selector("footer", timeout=10000)

            # 1. Verify ToolBelt and ActionButtons
            # We look for the TEXT inside the buttons, as title attribute holds the description
            page.wait_for_selector("text=Demote")
            page.wait_for_selector("text=Swap")
            page.wait_for_selector("text=Purge")
            page.wait_for_selector("text=Promote")

            # 2. Verify SubmitButton
            # Look for the STALIN, SORT! button text
            page.wait_for_selector("text=STALIN, SORT!")

            # Take screenshot of the footer area specifically or whole page
            page.screenshot(path="verification/refactor_verification.png")
            print("Screenshot taken.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/error_2.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_ui()
