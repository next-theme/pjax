export default function(target) {
  if (target == null) {
    return null;
  }

  const to = Object(target);

  for (let i = 1; i < arguments.length; i++) {
    const source = arguments[i];

    if (source != null) {
      for (const key in source) {
        // Avoid bugs when hasOwnProperty is shadowed
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          to[key] = source[key];
        }
      }
    }
  }
  return to;
}
