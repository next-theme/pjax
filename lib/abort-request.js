import noop from "./util/noop";

export default request => {
  if (request && request.readyState < 4) {
    request.onreadystatechange = noop;
    request.abort();
  }
};
