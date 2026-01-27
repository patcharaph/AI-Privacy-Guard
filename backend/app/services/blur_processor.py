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
        """Apply emoji overlay to a region of the image with distinct visual styles."""
        x, y, w, h = bbox.x, bbox.y, bbox.width, bbox.height
        
        # Ensure coordinates are within bounds
        h_img, w_img = image.shape[:2]
        x = max(0, min(x, w_img - 1))
        y = max(0, min(y, h_img - 1))
        w = min(w, w_img - x)
        h = min(h, h_img - y)
        
        if w <= 0 or h <= 0:
            return image
        
        # Create overlay
        overlay = image.copy()
        
        # Calculate center and radius
        center_x = x + w // 2
        center_y = y + h // 2
        radius = min(w, h) // 2
        
        # Normalize emoji (remove variation selectors)
        emoji_normalized = emoji.replace('\ufe0f', '').strip()
        
        # Draw distinct shapes based on emoji type
        if emoji_normalized == "😀":
            # SMILEY: Yellow circle with big smile
            cv2.circle(overlay, (center_x, center_y), radius, (0, 220, 255), -1)  # Yellow
            cv2.circle(overlay, (center_x, center_y), radius, (0, 180, 220), 3)   # Border
            # Eyes
            eye_r = max(3, radius // 6)
            cv2.circle(overlay, (center_x - radius//3, center_y - radius//4), eye_r, (0, 0, 0), -1)
            cv2.circle(overlay, (center_x + radius//3, center_y - radius//4), eye_r, (0, 0, 0), -1)
            # Big smile
            cv2.ellipse(overlay, (center_x, center_y + radius//6), 
                       (radius//2, radius//3), 0, 0, 180, (0, 0, 0), max(2, radius//15))
            
        elif emoji_normalized == "":
            # COOL: Yellow with BLACK sunglasses band
            cv2.circle(overlay, (center_x, center_y), radius, (0, 220, 255), -1)  # Yellow
            cv2.circle(overlay, (center_x, center_y), radius, (0, 180, 220), 3)   # Border
            # Sunglasses - thick black band
            glass_y = center_y - radius//4
            glass_h = max(4, radius//4)
            cv2.rectangle(overlay, (center_x - radius + radius//6, glass_y - glass_h//2),
                         (center_x + radius - radius//6, glass_y + glass_h//2), (0, 0, 0), -1)
            # Cool smirk
            cv2.ellipse(overlay, (center_x, center_y + radius//3), 
                       (radius//3, radius//6), 0, 0, 180, (0, 0, 0), max(2, radius//15))
            
        elif emoji_normalized == "�":
            # MONKEY: Brown circle with hands over eyes
            cv2.circle(overlay, (center_x, center_y), radius, (80, 130, 200), -1)  # Brown/tan
            cv2.circle(overlay, (center_x, center_y), radius, (50, 90, 140), 3)    # Border
            # Ears
            ear_r = radius // 3
            cv2.circle(overlay, (center_x - radius, center_y - radius//2), ear_r, (60, 100, 160), -1)
            cv2.circle(overlay, (center_x + radius, center_y - radius//2), ear_r, (60, 100, 160), -1)
            # Hands covering eyes (two ovals)
            cv2.ellipse(overlay, (center_x - radius//3, center_y - radius//6), 
                       (radius//2, radius//3), 0, 0, 360, (100, 160, 220), -1)
            cv2.ellipse(overlay, (center_x + radius//3, center_y - radius//6), 
                       (radius//2, radius//3), 0, 0, 360, (100, 160, 220), -1)
            
        elif emoji_normalized == "⭐":
            # STAR: Gold 5-pointed star shape (no circle)
            pts = []
            for i in range(5):
                angle = i * 72 - 90
                px = int(center_x + radius * 0.95 * np.cos(np.radians(angle)))
                py = int(center_y + radius * 0.95 * np.sin(np.radians(angle)))
                pts.append([px, py])
                angle2 = angle + 36
                px2 = int(center_x + radius * 0.4 * np.cos(np.radians(angle2)))
                py2 = int(center_y + radius * 0.4 * np.sin(np.radians(angle2)))
                pts.append([px2, py2])
            cv2.fillPoly(overlay, [np.array(pts)], (0, 215, 255))  # Gold
            cv2.polylines(overlay, [np.array(pts)], True, (0, 165, 200), 2)  # Border
            
        elif emoji_normalized == "❤":
            # HEART: Red heart shape (no circle)
            # Draw heart using two circles and a triangle
            hr = radius * 2 // 3
            cv2.circle(overlay, (center_x - hr//2, center_y - hr//3), hr//2 + 2, (0, 0, 220), -1)
            cv2.circle(overlay, (center_x + hr//2, center_y - hr//3), hr//2 + 2, (0, 0, 220), -1)
            pts = np.array([[center_x - radius + radius//6, center_y - radius//6], 
                           [center_x, center_y + radius - radius//6], 
                           [center_x + radius - radius//6, center_y - radius//6]], np.int32)
            cv2.fillPoly(overlay, [pts], (0, 0, 220))  # Red
            
        elif emoji_normalized == "🔒":
            # LOCK: Blue/gray padlock shape
            # Lock body (rectangle)
            body_w = radius
            body_h = radius
            body_x = center_x - body_w // 2
            body_y = center_y
            cv2.rectangle(overlay, (body_x, body_y), (body_x + body_w, body_y + body_h), (200, 150, 50), -1)
            cv2.rectangle(overlay, (body_x, body_y), (body_x + body_w, body_y + body_h), (150, 100, 30), 3)
            # Lock shackle (arc on top)
            cv2.ellipse(overlay, (center_x, body_y), (body_w//3, body_h//2), 0, 180, 360, (100, 100, 100), max(3, radius//8))
            # Keyhole
            cv2.circle(overlay, (center_x, body_y + body_h//3), max(2, radius//8), (50, 50, 50), -1)
            cv2.rectangle(overlay, (center_x - max(1, radius//12), body_y + body_h//3),
                         (center_x + max(1, radius//12), body_y + body_h*2//3), (50, 50, 50), -1)
        else:
            # Default: simple colored circle
            cv2.circle(overlay, (center_x, center_y), radius, (0, 200, 255), -1)
        
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
