export const getHttpErrorMessage = error => {
  return (error && error.response && error.response.data && error.response.data.details) ||
    (error && error.message) ||
    'Request failed'
}
