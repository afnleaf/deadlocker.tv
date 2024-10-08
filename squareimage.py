import os
from PIL import Image

def square_and_center_image(img):
    # Create a new square image with transparent background
    new_size = 347
    new_img = Image.new('RGBA', (new_size, new_size), (0, 0, 0, 0))
    
    # Calculate position to center the original image
    paste_position = ((new_size - img.width) // 2, (new_size - img.height) // 2)
    
    # Paste the original image onto the new image, preserving transparency
    new_img.paste(img, paste_position, img)
    
    return new_img

def process_directory(input_dir, output_dir):
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Loop through all WebP images in input directory
    for filename in os.listdir(input_dir):
        if filename.lower().endswith('.webp'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, os.path.splitext(filename)[0] + '.png')
            
            try:
                with Image.open(input_path) as img:
                    # Convert to RGBA if not already
                    img = img.convert('RGBA')
                    
                    squared_img = square_and_center_image(img)
                    squared_img.save(output_path, format='PNG')
                print(f"Processed: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

# Example usage
input_directory = "./webapp/public/images/hero_icons/default_rect"
output_directory = "./webapp/public/images/hero_icons/default"
process_directory(input_directory, output_directory)
print("All images processed.")

'''
import os
from PIL import Image

def square_and_center_image(img):
    mode = 'RGBA' if img.mode == 'RGBA' else 'RGB'
    # create a new square image with white background
    new_size = 347
    new_img = Image.new('RGB', (new_size, new_size), (0, 0, 0, 0) if mode == 'RGBA' else (255, 255, 255))
    # calculate position to center the new image and paste it
    paste_position = ((new_size - img.width) // 2, 0)
    if img.mode == 'RGBA':
        new_img.paste(img, paste_position, img)
    else:
        new_img.paste(img, paste_position)
    return new_img

def process_directory(input_dir, output_dir):
    # create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    # supported image file extensions
    valid_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.gif', 'webp')
    # loop through all images in input directory
    for filename in os.listdir(input_dir):
        if filename.lower().endswith(valid_extensions):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, filename)
            try:
                with Image.open(input_path) as img:
                    squared_img = square_and_center_image(img)
                    squared_img.save(output_path, format='PNG')
                print(f"Processed: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

# Example usage
input_directory = "./webapp/public/images/hero_icons/default_rect"
output_directory = "./webapp/public/images/hero_icons/default"

process_directory(input_directory, output_directory)
print("All images processed.")
'''
