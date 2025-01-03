/** @jsxImportSource solid-js */
import { createSignal, onMount } from 'solid-js';
import type { ImageGalleryProps } from './types';
import { ScrollButton } from './ScrollButton';
import { Thumbnail } from './Thumbnail';
import { MainImage } from './MainImage';

const ImageGallery = (props: ImageGalleryProps) => {
  const [selectedImage, setSelectedImage] = createSignal(props.mainImage);
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let galleryContainer: HTMLDivElement | undefined;

  const allImages = [props.mainImage, ...props.galleryImages.map(img => img.src)];

  const scrollGallery = (direction: 'left' | 'right') => {
    const currentIndex = selectedIndex();
    const totalImages = allImages.length;

    if (direction === 'left') {
      const newIndex = currentIndex === 0 ? totalImages - 1 : currentIndex - 1;
      setSelectedImage(allImages[newIndex]);
      setSelectedIndex(newIndex);
    } else if (direction === 'right') {
      const newIndex = currentIndex === totalImages - 1 ? 0 : currentIndex + 1;
      setSelectedImage(allImages[newIndex]);
      setSelectedIndex(newIndex);
    }
  };

  const updateMainImage = (image: string, index: number) => {
    setSelectedImage(image);
    setSelectedIndex(index);
  };

  return (
    <div class="flex flex-col gap-8 items-center w-full">
      <MainImage src={selectedImage()} alt="Main product image" />

      <div class="relative w-full">
        <ScrollButton direction="left" onClick={() => scrollGallery('left')} />

        <div class="flex justify-center px-2 sm:px-0">
          <div 
            class="flex gap-2 overflow-x-auto py-1 scrollbar-hide scroll-smooth items-center justify-center w-full sm:w-[95%]"
            ref={galleryContainer}
          >
            {allImages.map((image, index) => (
              <Thumbnail
                src={image}
                alt={index === 0 ? "Main product image" : props.galleryImages[index - 1].alt}
                isSelected={selectedIndex() === index}
                onClick={() => updateMainImage(image, index)}
              />
            ))}
          </div>
        </div>

        <ScrollButton direction="right" onClick={() => scrollGallery('right')} />
      </div>
    </div>
  );
};

export default ImageGallery;
