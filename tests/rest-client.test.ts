import { RestClient } from "../src";
import axios from "axios";
const mockAxios = axios.post as jest.Mock;

test("Could successfully instantiate client", () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  expect(client).toBeDefined();
});

test("Throws error when missing key", () => {
  expect(
    () =>
      new RestClient({
        apiToken: "API_TOKEN",
        graphName: "MY_GRAPH",
        contentType: "application/json",
      })
  ).toThrow();
});

test("Throws error when missing token", () => {
  expect(
    () =>
      new RestClient({
        apiKey: "API_KEY",
        graphName: "MY_GRAPH",
        contentType: "application/json",
      })
  ).toThrow();
});

test("Instantiate with just graph name", () => {
  const env = { ...process.env };
  process.env.ROAM_CLIENT_API_KEY = "API_KEY";
  process.env.ROAM_CLIENT_API_TOKEN = "API_TOKEN";
  const client = new RestClient({
    graphName: "MY_GRAPH",
  });
  expect(client).toBeDefined();
  process.env = { ...env };
});

test("Create Block with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  mockAxios.mockResolvedValue({
    data: { success: [{ string: "text", uid: "childUid" }] },
  });
  const response = await client.createBlock({
    parentUid: "parentUid",
    order: 0,
    text: "text",
    uid: "childUid",
  });
  expect(mockAxios).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "create-block",
      "graph-name": "MY_GRAPH",
      location: {
        "parent-uid": "parentUid",
        order: 0,
      },
      block: {
        string: "text",
        uid: "childUid",
      },
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  expect(response.string).toBe("text");
  expect(response.uid).toBe("childUid");
  jest.clearAllMocks();
});

test("Move Block with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  mockAxios.mockResolvedValue({
    data: { success: true },
  });
  const response = await client.moveBlock({
    parentUid: "parentUid",
    order: 0,
    uid: "childUid",
  });
  expect(mockAxios).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "move-block",
      "graph-name": "MY_GRAPH",
      location: {
        "parent-uid": "parentUid",
        order: 0,
      },
      block: {
        uid: "childUid",
      },
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  expect(response).toBe(true);
  jest.clearAllMocks();
});

test("Update Block with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  /*mockAxios.mockResolvedValue({
    data: { success: true },
  });*/
  await client.updateBlock({
    open: true,
    text: "text",
    uid: "childUid",
  });
  expect(mockAxios).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "update-block",
      "graph-name": "MY_GRAPH",
      block: {
        uid: "childUid",
        open: true,
        string: "text"
      },
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  // expect(response).toBe(true);
  jest.clearAllMocks();
});

test("Pull with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  mockAxios.mockResolvedValue({ data: { success: [[1]] } });
  await client.pull({
    selector: "[:block/string]",
    uid: "yS-It9SFL",
  });
  expect(axios.post).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "pull",
      "graph-name": "MY_GRAPH",
      selector: "[:block/string]",
      uid: "yS-It9SFL",
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  jest.clearAllMocks();
});

test("Q with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  mockAxios.mockResolvedValue({ data: { success: [[1]] } });
  const response = await client.q({
    query: "[:find ?e in $ ?title :where [?e :node/title ?title]]",
    inputs: ["title"],
  });
  expect(axios.post).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "q",
      "graph-name": "MY_GRAPH",
      query: "[:find ?e in $ ?title :where [?e :node/title ?title]]",
      inputs: ["title"],
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  expect(response).toHaveLength(1);
  expect(response[0]).toBe(1);
  jest.clearAllMocks();
});

test("Create Page with Rest Client", async () => {
  const client = new RestClient({
    apiKey: "API_KEY",
    apiToken: "API_TOKEN",
    graphName: "MY_GRAPH",
    contentType: "application/json",
  });
  mockAxios.mockResolvedValue({
    data: { success: [{ title: "My Page", uid: "mpgy3y0p2" }] },
  });
  const response = await client.createPage({
    title: "My Page",
    uid: "mpgy3y0p2",
  });
  expect(axios.post).toBeCalledWith(
    "https://4c67k7zc26.execute-api.us-west-2.amazonaws.com/v1/alphaAPI",
    {
      action: "create-page",
      "graph-name": "MY_GRAPH",
      page: {
        title: "My Page",
        uid: "mpgy3y0p2",
      },
    },
    {
      headers: {
        "x-api-key": "API_KEY",
        "x-api-token": "API_TOKEN",
        "Content-Type": "application/json",
      },
    }
  );
  expect(response.title).toBe("My Page");
  expect(response.uid).toBe("mpgy3y0p2");
  jest.clearAllMocks();
});
