const he = require("he");

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

  const sanitizedObj = {};
  for (const key in req.body) {
    if (req.body.hasOwnProperty(key)) {
      if (Array.isArray(req.body[key])) {
        // If the property is an array, keep it as is
        sanitizedObj[key] = req.body[key];
      } else {
        sanitizedObj[key] = he.encode(req.body[key]);
      }
    }
  }
  req.body = sanitizedObj;

  next();
};

module.exports = trimStringsMiddleware;
