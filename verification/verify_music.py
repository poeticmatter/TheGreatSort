from playwright.sync_api import sync_playwright

def verify_music_button():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Note: We must include the base path /TheGreatSort/ as per dev_server.log
        page = browser.new_page()

        # 1. Navigate
        print("Navigating...")
        page.goto("http://localhost:3000/TheGreatSort/")

        # 2. Wait for page load
        page.wait_for_selector('h1', timeout=10000)

        # 3. Locate Music Button (It should have title "Play Music" initially as it is off by default)
        print("Looking for Play Music button...")
        music_btn = page.get_by_role("button", name="Play Music")
        if not music_btn.is_visible():
            # Maybe it is already on (if localstorage persisted? unlikely in incognito/new context unless configured)
             music_btn = page.get_by_role("button", name="Mute Music")

        # Take initial screenshot
        page.screenshot(path="verification/music_btn_initial.png")

        # 4. Click to toggle
        print("Clicking button...")
        music_btn.click()

        # 5. Wait for state change
        # It should now say "Mute Music"
        page.wait_for_selector('button[title="Mute Music"]')

        # Take toggled screenshot
        page.screenshot(path="verification/music_btn_toggled.png")
        print("Screenshots taken.")

        browser.close()

if __name__ == "__main__":
    verify_music_button()
