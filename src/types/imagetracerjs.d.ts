declare module "imagetracerjs" {
  interface ImageDataLike {
    width: number;
    height: number;
    data: Uint8ClampedArray;
  }
  const ImageTracer: {
    imagedataToSVG(imgd: ImageDataLike, options?: string | Record<string, unknown>): string;
  };
  export default ImageTracer;
}
