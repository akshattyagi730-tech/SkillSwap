const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`;
    statusCode = 409;
  }
  if (err.name === "ValidationError") {
    message = Object.values(err.errors).map(v => v.message).join(", ");
    statusCode = 400;
  }
  if (err.name === "CastError") {
    message = `Invalid ID: ${err.value}`;
    statusCode = 400;
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = errorHandler;
