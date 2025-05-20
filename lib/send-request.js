import updateQueryString from "./util/update-query-string";

export default (location, options = {}, callback) => {
  let queryString;
  const requestOptions = options.requestOptions || {};
  const requestMethod = (requestOptions.requestMethod || "GET").toUpperCase();
  const requestParams = requestOptions.requestParams || null;
  const formData = requestOptions.formData || null;
  let requestPayload = null;
  const request = new XMLHttpRequest();
  const timeout = options.timeout || 0;

  request.onreadystatechange = () => {
    if (request.readyState === 4) {
      if (request.status === 200) {
        callback(request.responseText, request, location, options);
      } else if (request.status !== 0) {
        callback(null, request, location, options);
      }
    }
  };

  request.onerror = e => {
    console.log(e);
    callback(null, request, location, options);
  };

  request.ontimeout = () => {
    callback(null, request, location, options);
  };

  // Prepare the request payload for forms, if available
  if (requestParams && requestParams.length) {
    // Build query string
    queryString = requestParams
      .map(({name, value}) => {
        return `${name}=${value}`;
      })
      .join("&");

    switch (requestMethod) {
      case "GET":
        // Reset query string to avoid an issue with repeat submissions where checkboxes that were
        // previously checked are incorrectly preserved
        location = location.split("?")[0];

        // Append new query string
        location += `?${queryString}`;
        break;

      case "POST":
        // Send query string as request payload
        requestPayload = queryString;
        break;
    }
  } else if (formData) {
    requestPayload = formData;
  }

  // Add a timestamp as part of the query string if cache busting is enabled
  if (options.cacheBust) {
    location = updateQueryString(location, "t", Date.now());
  }

  request.open(requestMethod, location, true);
  request.timeout = timeout;
  request.setRequestHeader("X-Requested-With", "XMLHttpRequest");
  request.setRequestHeader("X-PJAX", "true");
  request.setRequestHeader(
    "X-PJAX-Selectors",
    JSON.stringify(options.selectors)
  );

  // Send the proper header information for POST forms
  if (requestPayload && requestMethod === "POST" && !formData) {
    request.setRequestHeader(
      "Content-Type",
      "application/x-www-form-urlencoded"
    );
  }

  request.send(requestPayload);

  return request;
};
