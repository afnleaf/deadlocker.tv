import os
from PIL import Image

def square_and_center_image(img):
    # create a new square image with transparent background
    new_size = 347
    new_img = Image.new('RGBA', (new_size, new_size), (0, 0, 0, 0))
    
    # calculate position to center the original image
    paste_position = ((new_size - img.width) // 2, (new_size - img.height) // 2)
    
    # paste the original image onto the new image, preserving transparency
    new_img.paste(img, paste_position, img)
    
    return new_img

def process_directory(input_dir, output_dir):
    # create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # loop through all WebP images in input directory
    for filename in os.listdir(input_dir):
        if filename.lower().endswith('.webp'):
            input_path = os.path.join(input_dir, filename)
            output_path = os.path.join(output_dir, os.path.splitext(filename)[0] + '.png')
            
            try:
                with Image.open(input_path) as img:
                    # convert to RGBA if not already
                    img = img.convert('RGBA')
                    
                    squared_img = square_and_center_image(img)
                    squared_img.save(output_path, format='PNG')
                print(f"Processed: {filename}")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

input_directory = "./webapp/public/images/hero_icons/default_rect"
output_directory = "./webapp/public/images/hero_icons/default"
process_directory(input_directory, output_directory)
print("All images processed.")

