import asyncio
from pyppeteer import launch


async def test_page_loads(url: str) -> dict:
    """
    Test if a page loads successfully using headless Chromium.

    Returns: {'success': bool, 'status': int, 'error': str or None}
    """
    browser = None
    try:
        browser = await launch(headless=True)
        page = await browser.newPage()

        response = await page.goto(url, {'waitUntil': 'networkidle0', 'timeout': 30000})
        status = response.status
        success = 200 <= status < 400

        await browser.close()

        return {
            'success': success,
            'status': status,
            'error': None if success else f'HTTP {status}'
        }
    except Exception as e:
        if browser:
            await browser.close()
        return {
            'success': False,
            'status': 0,
            'error': str(e)
        }


def test_page(url: str) -> dict:
    """
    Test if a page loads (synchronous wrapper for asyncio).

    Args:
        url: Full URL to test (e.g., 'https://rivalalert.ai')

    Returns:
        dict with 'success', 'status', 'error' keys

    Example:
        >>> result = test_page('https://rivalalert.ai')
        >>> if result['success']:
        ...     print(f"✅ Page loads successfully (HTTP {result['status']})")
        ... else:
        ...     print(f"❌ Page failed: {result['error']}")
    """
    return asyncio.run(test_page_loads(url))
