export const getHttpErrorMessage = error => {
  return (error.response.data && error.response.data.details) || error.message
}
