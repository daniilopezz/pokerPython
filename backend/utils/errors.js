class AppError extends Error {
  constructor(statusCode, message, details = null, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    this.code = code;
  }
}

function badRequest(message, details = null) {
  return new AppError(400, message, details, "BAD_REQUEST");
}

function notFound(message = "Ruta no encontrada") {
  return new AppError(404, message, null, "NOT_FOUND");
}

function methodNotAllowed(method, allowed) {
  return new AppError(405, `Metodo ${method} no permitido`, { allowed }, "METHOD_NOT_ALLOWED");
}

module.exports = { AppError, badRequest, notFound, methodNotAllowed };
