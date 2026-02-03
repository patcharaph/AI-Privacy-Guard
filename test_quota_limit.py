"""
Test script for quota request limit functionality.
Tests that each email can only request extra quota once.
"""
import requests
import sys

BASE_URL = "http://127.0.0.1:8080/api"

def test_quota_request_limit():
    print("=" * 60)
    print("Testing Quota Request Limit (1 per email)")
    print("=" * 60)
    
    # Test 1: First request with email should succeed
    print("\n[Test 1] First request with test@example.com...")
    response = requests.post(
        f"{BASE_URL}/request-quota",
        data={"use_case": "Testing quota limit", "email": "test@example.com"}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    
    if response.status_code == 200:
        print("  ✅ PASS: First request succeeded")
    else:
        print("  ❌ FAIL: First request should succeed")
        return False
    
    # Test 2: Second request with same email should fail (429)
    print("\n[Test 2] Second request with same email (test@example.com)...")
    response = requests.post(
        f"{BASE_URL}/request-quota",
        data={"use_case": "Testing again", "email": "test@example.com"}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    
    if response.status_code == 429:
        print("  ✅ PASS: Duplicate email blocked with 429")
    else:
        print("  ❌ FAIL: Should return 429 for duplicate email")
        return False
    
    # Test 3: Request with different email should succeed
    print("\n[Test 3] Request with different email (other@example.com)...")
    response = requests.post(
        f"{BASE_URL}/request-quota",
        data={"use_case": "Different user", "email": "other@example.com"}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    
    if response.status_code == 200:
        print("  ✅ PASS: Different email succeeded")
    else:
        print("  ❌ FAIL: Different email should succeed")
        return False
    
    # Test 4: Request without email should succeed (optional field)
    print("\n[Test 4] Request without email...")
    response = requests.post(
        f"{BASE_URL}/request-quota",
        data={"use_case": "Anonymous request"}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    
    if response.status_code == 200:
        print("  ✅ PASS: Request without email succeeded")
    else:
        print("  ❌ FAIL: Request without email should succeed")
        return False
    
    # Test 5: Case insensitivity - TEST@EXAMPLE.COM should be blocked
    print("\n[Test 5] Case insensitivity (TEST@EXAMPLE.COM)...")
    response = requests.post(
        f"{BASE_URL}/request-quota",
        data={"use_case": "Uppercase email", "email": "TEST@EXAMPLE.COM"}
    )
    print(f"  Status: {response.status_code}")
    print(f"  Response: {response.json()}")
    
    if response.status_code == 429:
        print("  ✅ PASS: Uppercase variant blocked (case insensitive)")
    else:
        print("  ❌ FAIL: Should block uppercase variant of same email")
        return False
    
    print("\n" + "=" * 60)
    print("All tests PASSED! ✅")
    print("=" * 60)
    return True


if __name__ == "__main__":
    try:
        # Check if server is running
        health = requests.get(f"{BASE_URL}/health", timeout=3)
        if health.status_code != 200:
            print("❌ Server health check failed")
            sys.exit(1)
        print(f"✅ Server is running: {health.json()}")
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server at http://127.0.0.1:8080")
        print("   Please start the server first:")
        print("   cd backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8080")
        sys.exit(1)
    
    success = test_quota_request_limit()
    sys.exit(0 if success else 1)
