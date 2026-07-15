import {
    credentials,
    loadPackageDefinition,
    type ChannelOptions,
    type Client,
    type ServiceError,
} from "@grpc/grpc-js";
import { loadSync } from "@grpc/proto-loader";
import { fileURLToPath } from "node:url";

const MAX_GRPC_MESSAGE_SIZE = 64 * 1024 * 1024;

export interface GrpcModelInfo {
    unique_name: string;
    display_name: string;
    description: string;
}

export interface GetModelsResponse {
    models: GrpcModelInfo[];
}

export interface RemoveBackgroundResponse {
    image: Buffer;
    model_name: string;
    processing_time_ms: string;
}

interface RemoveBackgroundRequest {
    image: Buffer;
    model_name: string;
}

interface BackgroundRemovalClient extends Client {
    GetModels(
        request: Record<string, never>,
        callback: (
            error: ServiceError | null,
            response: GetModelsResponse,
        ) => void,
    ): void;

    RemoveBackground(
        request: RemoveBackgroundRequest,
        callback: (
            error: ServiceError | null,
            response: RemoveBackgroundResponse,
        ) => void,
    ): void;
}

interface BackgroundRemovalPackage {
    background_removal: {
        v1: {
            BackgroundRemovalService: new (
                address: string,
                channelCredentials: ReturnType<
                    typeof credentials.createInsecure
                >,
                options?: ChannelOptions,
            ) => BackgroundRemovalClient;
        };
    };
}

const localProtoPath = fileURLToPath(
    new URL(
        "../../../proto/background_removal.proto",
        import.meta.url,
    ),
);

const protoPath =
    process.env.GRPC_PROTO_PATH ?? localProtoPath;

const packageDefinition = loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const grpcPackage = loadPackageDefinition(
    packageDefinition,
) as unknown as BackgroundRemovalPackage;

let client: BackgroundRemovalClient | undefined;

export function getBackgroundRemovalClient(): BackgroundRemovalClient {
    if (client) {
        return client;
    }

    const config = useRuntimeConfig();

    client =
        new grpcPackage.background_removal.v1.BackgroundRemovalService(
            config.grpcAddress,
            credentials.createInsecure(),
            {
                "grpc.max_send_message_length":
                MAX_GRPC_MESSAGE_SIZE,

                "grpc.max_receive_message_length":
                MAX_GRPC_MESSAGE_SIZE,
            },
        );

    return client;
}

export function getGrpcModels(): Promise<GetModelsResponse> {
    const client = getBackgroundRemovalClient();

    return new Promise((resolve, reject) => {
        client.GetModels({}, (error, response) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(response);
        });
    });
}

export function removeBackgroundGrpc(
    image: Buffer,
    modelName: string,
): Promise<RemoveBackgroundResponse> {
    const client = getBackgroundRemovalClient();

    return new Promise((resolve, reject) => {
        client.RemoveBackground(
            {
                image,
                model_name: modelName,
            },
            (error, response) => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(response);
            },
        );
    });
}