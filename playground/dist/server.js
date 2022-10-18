const server = (event) => {
  console.log("hello");
  const response = new Response(
    `<div>Hello adasdasd adasdsd World ${JSON.stringify(
      new URL(event.request.url),
      null,
      2
    )}</div>`,
    {
      headers: {
        "content-type": "text/html"
      }
    }
  );
  return response;
};
export {
  server as default
};
