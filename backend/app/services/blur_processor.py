import cv2
import numpy as np
from typing import List
import logging

from app.models.schemas import BoundingBox, BlurMode

logger = logging.getLogger(__name__)

# Emoji overlay image (will be created as a simple circle with face emoji pattern)
EMOJI_PATTERNS = {
    "face": "😊",
    "license_plate": "🔒"
}


class BlurProcessor:
    """Handles various blur and privacy protection methods."""
    
    @staticmethod
    def apply_gaussian_blur(image: np.ndarray, bbox: BoundingBox, 
                           intensity: int = 80) -> np.ndarray:
        """Apply Gaussian blur to a region of the image."""
        x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height
        
        # Ensure coordinates are within bounds
        h_img, w_img = image.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = min(w, w_img - x)
        h = min(h, h_img - y)
        
        if w <= 0 or h <= 0:
            return image
        
        # Calculate kernel size based on intensity (must be odd)
        kernel_size = max(3, int((intensity / 100) * min(w, h)))
        if kernel_size % 2 == 0:
            kernel_size += 1
        
        # Extract region and apply blur
        roi = image[y:y+h, x:x+w]
        blurred_roi = cv2.GaussianBlur(roi, (kernel_size, kernel_size), 0)
        
        # Apply multiple passes for stronger blur at high intensity
        if intensity > 50:
            passes = int((intensity - 50) / 25) + 1
            for _ in range(passes):
                blurred_roi = cv2.GaussianBlur(blurred_roi, (kernel_size, kernel_size), 0)
        
        image[y:y+h, x:x+w] = blurred_roi
        return image
    
    @staticmethod
    def apply_pixelation(image: np.ndarray, bbox: BoundingBox, 
                        intensity: int = 80) -> np.ndarray:
        """Apply pixelation effect to a region of the image."""
        x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height
        
        # Ensure coordinates are within bounds
        h_img, w_img = image.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = min(w, w_img - x)
        h = min(h, h_img - y)
        
        if w <= 0 or h <= 0:
            return image
        
        # Calculate pixel block size based on intensity
        # Higher intensity = larger blocks = more pixelated
        block_size = max(2, int((intensity / 100) * min(w, h) / 4))
        
        # Extract region
        roi = image[y:y+h, x:x+w]
        
        # Resize down then up to create pixelation effect
        small_w = max(1, w // block_size)
        small_h = max(1, h // block_size)
        
        small = cv2.resize(roi, (small_w, small_h), interpolation=cv2.INTER_LINEAR)
        pixelated = cv2.resize(small, (w, h), interpolation=cv2.INTER_NEAREST)
        
        image[y:y+h, x:x+w] = pixelated
        return image
    
    @staticmethod
    def apply_emoji_overlay(image: np.ndarray, bbox: BoundingBox, 
                           intensity: int = 80, emoji: str = "😀") -> np.ndarray:
        """Apply emoji overlay to a region of the image."""
        x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height
        
        # Ensure coordinates are within bounds
        h_img, w_img = image.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = min(w, w_img - x)
        h = min(h, h_img - y)
        
        if w <= 0 or h <= 0:
            return image
        
        # Create a colored overlay (emoji-like circle)
        overlay = image.copy()
        
        # Calculate center and radius
        center_x = x + w // 2
        center_y = y + h // 2
        radius = min(w, h) // 2
        
        # Normalize emoji (remove variation selectors)
        emoji_normalized = emoji.replace('\ufe0f', '').strip()
        
        # Choose color based on emoji type
        emoji_colors = {
            "😀": (0, 200, 255),   # Yellow - Smile
            "😎": (0, 200, 255),   # Yellow - Cool
            "🙈": (139, 90, 43),   # Brown - Monkey
            "⭐": (0, 215, 255),    # Gold - Star
            "❤": (0, 0, 255),      # Red - Heart (without variation selector)
            "🔒": (255, 150, 0),   # Blue - Lock
        }
        color = emoji_colors.get(emoji_normalized, (0, 200, 255))
        
        # Draw filled circle
        cv2.circle(overlay, (center_x, center_y), radius, color, -1)
        
        # Add features based on emoji type (use normalized emoji for comparison)
        if emoji_normalized in ["😀", "😎"]:
            # Eyes
            eye_radius = max(2, radius // 8)
            eye_y = center_y - radius // 4
            left_eye_x = center_x - radius // 3
            right_eye_x = center_x + radius // 3
            cv2.circle(overlay, (left_eye_x, eye_y), eye_radius, (0, 0, 0), -1)
            cv2.circle(overlay, (right_eye_x, eye_y), eye_radius, (0, 0, 0), -1)
            
            if emoji_normalized == "😎":
                # Sunglasses for cool emoji
                cv2.line(overlay, (left_eye_x - eye_radius*2, eye_y), 
                        (right_eye_x + eye_radius*2, eye_y), (0, 0, 0), max(2, radius // 10))
            
            # Smile
            smile_y = center_y + radius // 4
            cv2.ellipse(overlay, (center_x, smile_y), 
                       (radius // 3, radius // 6), 0, 0, 180, (0, 0, 0), 2)
        elif emoji_normalized == "🙈":
            # Monkey covering eyes
            eye_y = center_y - radius // 6
            cv2.ellipse(overlay, (center_x, eye_y), 
                       (radius // 2, radius // 4), 0, 0, 360, (80, 50, 30), -1)
        elif emoji_normalized == "⭐":
            # Star shape (simplified as circle with points)
            pts = []
            for i in range(5):
                angle = i * 72 - 90
                px = int(center_x + radius * 0.9 * np.cos(np.radians(angle)))
                py = int(center_y + radius * 0.9 * np.sin(np.radians(angle)))
                pts.append([px, py])
                angle2 = angle + 36
                px2 = int(center_x + radius * 0.4 * np.cos(np.radians(angle2)))
                py2 = int(center_y + radius * 0.4 * np.sin(np.radians(angle2)))
                pts.append([px2, py2])
            cv2.fillPoly(overlay, [np.array(pts)], color)
        elif emoji_normalized == "❤":
            # Heart shape (simplified)
            cv2.circle(overlay, (center_x - radius//3, center_y - radius//4), radius//2, color, -1)
            cv2.circle(overlay, (center_x + radius//3, center_y - radius//4), radius//2, color, -1)
            pts = np.array([[center_x - radius, center_y], [center_x, center_y + radius], 
                           [center_x + radius, center_y]], np.int32)
            cv2.fillPoly(overlay, [pts], color)
        elif emoji_normalized == "🔒":
            # Lock icon
            lock_size = radius // 2
            lock_x = center_x - lock_size // 2
            lock_y = center_y - lock_size // 4
            cv2.rectangle(overlay, (lock_x, lock_y), 
                         (lock_x + lock_size, lock_y + lock_size), (0, 0, 0), -1)
            cv2.ellipse(overlay, (center_x, lock_y), 
                       (lock_size // 3, lock_size // 2), 0, 180, 360, (0, 0, 0), 2)
        
        # Blend overlay with original based on intensity
        alpha = intensity / 100
        cv2.addWeighted(overlay, alpha, image, 1 - alpha, 0, image)
        
        return image
    
    @classmethod
    def process_image(cls, image: np.ndarray, detections: List[BoundingBox],
                     blur_mode: BlurMode, intensity: int = 80, emoji: str = "😀") -> np.ndarray:
        """Process an image by applying blur to all detected regions."""
        result = image.copy()
        
        for detection in detections:
            if blur_mode == BlurMode.GAUSSIAN:
                result = cls.apply_gaussian_blur(result, detection, intensity)
            elif blur_mode == BlurMode.PIXELATION:
                result = cls.apply_pixelation(result, detection, intensity)
            elif blur_mode == BlurMode.EMOJI:
                result = cls.apply_emoji_overlay(result, detection, intensity, emoji)
        
        return result


blur_processor = BlurProcessor()
