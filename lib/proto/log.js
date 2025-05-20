export default function(...args) {
  if (this.options.debug && console) {
    if (typeof console.log === "function") {
      console.log(...args);
    }
    // IE is weird
    else if (console.log) {
      console.log(args);
    }
  }
}
