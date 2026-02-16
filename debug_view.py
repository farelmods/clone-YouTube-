from playwright.sync_api import sync_playwright
import time
import os

def debug_view():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        iphone_13 = p.devices['iPhone 13']
        context = browser.new_context(**iphone_13)
        page = context.new_page()

        page.goto('http://localhost:8000')
        page.wait_for_load_state('networkidle')
        time.sleep(2)

        page.screenshot(path='/home/jules/verification/debug_initial.png')

        # Check visibility of elements
        mobile_search_btn_visible = page.is_visible('#mobile-search-btn')
        print(f"Mobile Search Button Visible: {mobile_search_btn_visible}")

        # Check computed style
        display = page.evaluate("() => getComputedStyle(document.getElementById('mobile-search-btn')).display")
        print(f"Mobile Search Button Display: {display}")

        browser.close()

if __name__ == "__main__":
    if not os.path.exists('/home/jules/verification'):
        os.makedirs('/home/jules/verification')
    debug_view()
