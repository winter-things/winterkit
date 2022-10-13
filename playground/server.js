/// <reference lib="dom" />

console.log("hello");

export default (event) => {
  console.log("hello");
  throw new Error("Server error");
  const response = new Response(
    `<div>Hello adasdasd adasdsd World ${JSON.stringify(
      new URL(event.request.url),
      null,
      2
    )}</div>`,
    {
      headers: {
        "content-type": "text/html",
      },
    }
  );
  return response;
};

// addEventListener("fetch", (event) => {
//   event.respondWith(new Response("<div>Hello</div>"));
// });
