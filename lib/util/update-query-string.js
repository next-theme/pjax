export default (uri, key, value) => {
  const re = new RegExp(`([?&])${key}=.*?(&|$)`, "i");
  const separator = uri.includes("?") ? "&" : "?";
  if (uri.match(re)) {
    return uri.replace(re, `$1${key}=${value}$2`);
  } else {
    return `${uri + separator + key}=${value}`;
  }
};
