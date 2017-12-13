import { spawn, ChildProcess } from "child_process";
import grpc, { ServerUnaryCall, sendUnaryData } from "grpc";
import ZipkinMock from "./zipkin-mock";
import { envoyFetch, EnvoyContext, EnvoyGrpcRequestParams } from "../../src/envoy-node-boilerplate";

let serverId = 0;
const PROTO_PATH = __dirname + "/ping.proto";
const testProto: any = grpc.load(PROTO_PATH).test;

const response = { message: "pong" };

export const TEST_PORT_START = 10000;

export default class GrpcTestServer {
  readonly envoy: ChildProcess;
  readonly server: grpc.Server;
  readonly zipkin: ZipkinMock;

  constructor() {
    let port = TEST_PORT_START + serverId * 5;
    serverId += 1;
    const envoyIngressPort = port++;
    const envoyEgressPort = port++;
    const servicePort = port++;
    const adminPort = port++;
    const zipkinPort = port++;

    // TODO build envoy config
    this.envoy = spawn("echo", ["-c", "config"]);
    this.zipkin = new ZipkinMock(zipkinPort);

    // start server
    this.server = new grpc.Server();
    this.server.addService(testProto.Ping.service, { wrapper: this.wrapper, inner: this.inner });
    this.server.bind(`localhost:${servicePort}`, grpc.ServerCredentials.createInsecure());
    this.server.start();
  }

  private wrapper(call: ServerUnaryCall, callback: sendUnaryData): void {
    const ctx = new EnvoyContext(call.metadata);
    const params = new EnvoyGrpcRequestParams(ctx, {
      retryOn: [],
      timeout: -1
    });
    params.assembleRequestMeta();
    // TODO
    callback(undefined, response);
  }

  private inner(call: ServerUnaryCall, callback: sendUnaryData): void {
    // TODO
    callback(undefined, response);
  }

  stop() {
    this.envoy.kill();
    this.server.forceShutdown();
    this.zipkin.stop();
    // TODO clean up envoy config file
  }
}
