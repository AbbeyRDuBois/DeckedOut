declare module '*.css'; // Declaring that the css file is safe to remove any unnecessary errors that the .ts files throw

declare module '*.png' { // Decaring that if I try to import a png, just trust that webpack is handling it
  const value: string;
  export default value;
}