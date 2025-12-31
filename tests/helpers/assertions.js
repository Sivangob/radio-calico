function assertRatingResponse(response, expectedThumbsUp, expectedThumbsDown) {
  expect(response.body).toHaveProperty('thumbs_up');
  expect(response.body).toHaveProperty('thumbs_down');
  expect(response.body.thumbs_up).toBe(expectedThumbsUp);
  expect(response.body.thumbs_down).toBe(expectedThumbsDown);
}

function assertErrorResponse(response, statusCode, errorMessage) {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.error).toBe(errorMessage);
  }
}

function assertSuccessResponse(response, message) {
  expect(response.status).toBe(200);
  expect(response.body).toHaveProperty('message');
  if (message) {
    expect(response.body.message).toBe(message);
  }
}

module.exports = {
  assertRatingResponse,
  assertErrorResponse,
  assertSuccessResponse
};
