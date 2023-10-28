const trimStringsMiddleware = (req, res, next) => {
  // Recursively traverse the request object and trim strings
  const trimStrings = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === "object") {
        trimStrings(obj[key]);
      }
    }
  };

  trimStrings(req.body);
  trimStrings(req.query);
  trimStrings(req.params);

  next();
};

module.exports = trimStringsMiddleware;
