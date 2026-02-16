import asyncio
from playwright.async_api import async_playwright
import os

async def verify():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        # Android Viewport
        context = await browser.new_context(
            viewport={'width': 360, 'height': 800},
            user_agent='Mozilla/5.0 (Linux; Android 10; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36'
        )
        page = await context.new_page()

        # Start server
        os.system("node server.js > server.log 2>&1 &")
        await asyncio.sleep(2)

        await page.goto('http://localhost:3000')

        # Handle login
        await page.fill('#login-form input[type="text"]', 'testuser@playtube.com')
        await page.fill('#login-form input[type="password"]', 'password123')
        await page.click('.submit-btn')
        await page.wait_for_timeout(1000)

        # 1. Verify Home & Mini-player clipping
        # Click a video to open it
        await page.click('.card:first-child')
        await page.wait_for_timeout(1000)
        # Close it to see mini player
        await page.click('#close-player')
        await page.wait_for_timeout(500)
        await page.screenshot(path='/home/jules/verification/mini_player_check.png')

        # 2. Verify Channel View & Back Button
        # Open a channel from the mini-player or home (let's go home first)
        await page.click('.nav-item:first-child') # Beranda
        await page.wait_for_timeout(500)
        await page.click('.channel-avatar:first-child')
        await page.wait_for_timeout(1000)
        await page.screenshot(path='/home/jules/verification/channel_view_check.png')

        # Check if title is "true" or actual name
        title = await page.inner_text('#channel-name-display')
        print(f"Channel Title: {title}")

        # Click UI back button
        await page.click('#close-channel')
        await page.wait_for_timeout(500)
        await page.screenshot(path='/home/jules/verification/after_channel_back.png')

        # 3. Verify Video Modal Back Button
        await page.click('.card:first-child')
        await page.wait_for_timeout(1000)
        await page.click('#close-player')
        await page.wait_for_timeout(500)
        await page.screenshot(path='/home/jules/verification/after_video_back.png')

        await browser.close()
        os.system("pkill -f server.js")

if __name__ == "__main__":
    if not os.path.exists('/home/jules/verification'):
        os.makedirs('/home/jules/verification')
    asyncio.run(verify())
