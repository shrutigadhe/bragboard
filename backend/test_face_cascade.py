import cv2
import os

cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
print("Cascade path:", cascade_path)
print("Exists:", os.path.exists(cascade_path))
face_cascade = cv2.CascadeClassifier(cascade_path)
print("Empty:", face_cascade.empty())
