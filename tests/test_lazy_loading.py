import sys
import os
import time
import unittest
from unittest.mock import MagicMock, patch
import numpy as np

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

# Mock libraries to avoid actual heavy loading and dependency issues during test
sys.modules['insightface'] = MagicMock()
sys.modules['insightface.app'] = MagicMock()
sys.modules['ultralytics'] = MagicMock()
sys.modules['cv2'] = MagicMock()

# Now import detector
from app.services.detector import PrivacyDetector

class TestLazyLoading(unittest.TestCase):
    def setUp(self):
        # Reset singleton logic for testing
        PrivacyDetector._instance = None
        PrivacyDetector._initialized = False

    @patch('app.services.detector.YOLO')
    @patch('app.services.detector.FaceAnalysis')
    def test_lazy_initialization(self, mock_face_analysis, mock_yolo):
        print("\nTesting Lazy Initialization...")
        start_time = time.time()
        detector = PrivacyDetector()
        end_time = time.time()
        
        duration = end_time - start_time
        print(f"Initialization took {duration:.4f} seconds")
        
        # Verify it was fast (should be practically instant)
        self.assertLess(duration, 0.5, "Initialization took too long")
        
        # Verify models are NOT loaded yet
        self.assertFalse(detector.models_loaded)
        self.assertFalse(detector.face_detector_loaded)
        self.assertFalse(detector.plate_detector_loaded)
        
        # Verify constructors were NOT called
        mock_face_analysis.assert_not_called()
        mock_yolo.assert_not_called()
        print("PASS: Models were not loaded during initialization")

        # Now trigger loading
        print("Triggering model load via detect_faces...")
        dummy_image = np.zeros((100, 100, 3), dtype=np.uint8)
        
        # Mock detection result to avoid errors in processing
        mock_face_instance = mock_face_analysis.return_value
        mock_face_instance.get.return_value = [] # No faces found
        
        detector.detect_faces(dummy_image)
        
        # Verify models ARE loaded now
        mock_face_analysis.assert_called_once()
        print("PASS: Face model loaded on demand")

if __name__ == '__main__':
    unittest.main()
