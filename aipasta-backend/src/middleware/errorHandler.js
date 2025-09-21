class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0];
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

const handleJWTError = () =>
  new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
  new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, req, res) => {
  const payload = {
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  };

  // If request has an authenticated user, include a minimal safe summary so clients can update UI
  try {
    if (req && req.user) {
      // Include under both `user` and `data.user` to handle various frontend consumers
      payload.user = {
        credits: req.user.credits,
        tokens: req.user.tokens
      };
      payload.data = payload.data || {};
      payload.data.user = payload.user;
    }
  } catch (e) {
    // ignore
  }

  res.status(err.statusCode).json(payload);
};

const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    const payload = {
      status: err.status,
      message: err.message,
      timestamp: new Date().toISOString()
    };

    // Include minimal user summary for operational errors when available (helps client update wallet)
    try {
      if (req && req.user) {
        payload.user = {
          credits: req.user.credits,
          tokens: req.user.tokens
        };
        payload.data = payload.data || {};
        payload.data.user = payload.user;
      }
    } catch (e) {
      // ignore
    }

    res.status(err.statusCode).json(payload);
  }
  // Programming or other unknown error: don't leak error details
  else {
    console.error('ERROR 💥:', err);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong!',
      timestamp: new Date().toISOString()
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, req, res);
  }
};

module.exports = {
  AppError,
  errorHandler
};