import "dotenv/config";
import dns from "dns";
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {}

import test, { describe, before, after } from "node:test";
import assert from "node:assert";
import http from "http";
import mongoose from "mongoose";

import connectDB from "../lib/connectDB.js";
import { app } from "../index.js";

describe("API URL Normalization & Route Tests", () => {
  let testServer;
  let baseUrl;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    testServer = http.createServer(app);
    await new Promise((resolve) => {
      testServer.listen(0, () => {
        const port = testServer.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (testServer) {
      testServer.closeAllConnections?.();
      await new Promise((resolve) => testServer.close(resolve));
    }
    await mongoose.connection.close();
    console.log("Active handles count:", process._getActiveHandles().length);
    console.log("Active handles:", process._getActiveHandles().map((h) => h.constructor?.name || typeof h));
  });

  test("1.1 Single slash /posts?page=1&limit=10 returns 200 with posts list structure", async () => {
    const res = await fetch(`${baseUrl}/posts?page=1&limit=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.posts !== undefined, "Response should have posts array");
    assert.ok(Array.isArray(data.posts), "posts should be an array");
  });

  test("1.2 Duplicate slash //posts?page=1&limit=10 is normalized and returns 200 instead of 404", async () => {
    const res = await fetch(`${baseUrl}//posts?page=1&limit=10`);
    assert.strictEqual(res.status, 200, "Should normalize double slashes and not return 404");
    const data = await res.json();
    assert.ok(Array.isArray(data.posts), "posts should be an array");
  });

  test("1.3 Single slash featured posts /posts?featured=true&limit=4&sort=newest returns 200", async () => {
    const res = await fetch(`${baseUrl}/posts?featured=true&limit=4&sort=newest`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.posts), "posts should be an array");
  });

  test("1.4 Duplicate slash featured posts //posts?featured=true&limit=4&sort=newest returns 200 instead of 404", async () => {
    const res = await fetch(`${baseUrl}//posts?featured=true&limit=4&sort=newest`);
    assert.strictEqual(res.status, 200, "Should normalize double slashes and return 200");
    const data = await res.json();
    assert.ok(Array.isArray(data.posts), "posts should be an array");
  });

  test("1.5 Multiple consecutive slashes ///posts?limit=1 are normalized", async () => {
    const res = await fetch(`${baseUrl}///posts?limit=1`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.posts));
  });
});
