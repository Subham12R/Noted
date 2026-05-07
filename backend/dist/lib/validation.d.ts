import { z } from "zod";
export declare const canvasSnapshotSchema: z.ZodObject<{
    elements: z.ZodArray<z.ZodUnknown, "many">;
    appState: z.ZodOptional<z.ZodUnknown>;
    version: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    version: number;
    elements: unknown[];
    appState?: unknown;
}, {
    version: number;
    elements: unknown[];
    appState?: unknown;
}>;
export declare const blockAttrsSchema: z.ZodOptional<z.ZodObject<{
    level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
    language: z.ZodOptional<z.ZodString>;
    listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
    checked: z.ZodOptional<z.ZodBoolean>;
    alt: z.ZodOptional<z.ZodString>;
    src: z.ZodOptional<z.ZodString>;
    aiPrompt: z.ZodOptional<z.ZodString>;
    aiModel: z.ZodOptional<z.ZodString>;
}, "passthrough", z.ZodTypeAny, z.objectOutputType<{
    level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
    language: z.ZodOptional<z.ZodString>;
    listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
    checked: z.ZodOptional<z.ZodBoolean>;
    alt: z.ZodOptional<z.ZodString>;
    src: z.ZodOptional<z.ZodString>;
    aiPrompt: z.ZodOptional<z.ZodString>;
    aiModel: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">, z.objectInputType<{
    level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
    language: z.ZodOptional<z.ZodString>;
    listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
    checked: z.ZodOptional<z.ZodBoolean>;
    alt: z.ZodOptional<z.ZodString>;
    src: z.ZodOptional<z.ZodString>;
    aiPrompt: z.ZodOptional<z.ZodString>;
    aiModel: z.ZodOptional<z.ZodString>;
}, z.ZodTypeAny, "passthrough">>>;
export declare const blockSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]>;
    content: z.ZodUnion<[z.ZodString, z.ZodObject<{
        elements: z.ZodArray<z.ZodUnknown, "many">;
        appState: z.ZodOptional<z.ZodUnknown>;
        version: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        version: number;
        elements: unknown[];
        appState?: unknown;
    }, {
        version: number;
        elements: unknown[];
        appState?: unknown;
    }>, z.ZodNull]>;
    attrs: z.ZodOptional<z.ZodObject<{
        level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
        language: z.ZodOptional<z.ZodString>;
        listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
        checked: z.ZodOptional<z.ZodBoolean>;
        alt: z.ZodOptional<z.ZodString>;
        src: z.ZodOptional<z.ZodString>;
        aiPrompt: z.ZodOptional<z.ZodString>;
        aiModel: z.ZodOptional<z.ZodString>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
        language: z.ZodOptional<z.ZodString>;
        listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
        checked: z.ZodOptional<z.ZodBoolean>;
        alt: z.ZodOptional<z.ZodString>;
        src: z.ZodOptional<z.ZodString>;
        aiPrompt: z.ZodOptional<z.ZodString>;
        aiModel: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
        language: z.ZodOptional<z.ZodString>;
        listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
        checked: z.ZodOptional<z.ZodBoolean>;
        alt: z.ZodOptional<z.ZodString>;
        src: z.ZodOptional<z.ZodString>;
        aiPrompt: z.ZodOptional<z.ZodString>;
        aiModel: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough">>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    content: string | {
        version: number;
        elements: unknown[];
        appState?: unknown;
    } | null;
    type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
    attrs?: z.objectOutputType<{
        level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
        language: z.ZodOptional<z.ZodString>;
        listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
        checked: z.ZodOptional<z.ZodBoolean>;
        alt: z.ZodOptional<z.ZodString>;
        src: z.ZodOptional<z.ZodString>;
        aiPrompt: z.ZodOptional<z.ZodString>;
        aiModel: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}, {
    id: string;
    content: string | {
        version: number;
        elements: unknown[];
        appState?: unknown;
    } | null;
    type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
    attrs?: z.objectInputType<{
        level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
        language: z.ZodOptional<z.ZodString>;
        listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
        checked: z.ZodOptional<z.ZodBoolean>;
        alt: z.ZodOptional<z.ZodString>;
        src: z.ZodOptional<z.ZodString>;
        aiPrompt: z.ZodOptional<z.ZodString>;
        aiModel: z.ZodOptional<z.ZodString>;
    }, z.ZodTypeAny, "passthrough"> | undefined;
}>;
export declare const createFolderSchema: z.ZodObject<{
    name: z.ZodString;
    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    parentId?: string | null | undefined;
    color?: string | undefined;
}, {
    name: string;
    parentId?: string | null | undefined;
    color?: string | undefined;
}>;
export declare const updateFolderSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    parentId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    color: z.ZodOptional<z.ZodString>;
    image: z.ZodOptional<z.ZodString>;
    isExpanded: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    image?: string | undefined;
    name?: string | undefined;
    parentId?: string | null | undefined;
    color?: string | undefined;
    isExpanded?: boolean | undefined;
    sortOrder?: number | undefined;
}, {
    image?: string | undefined;
    name?: string | undefined;
    parentId?: string | null | undefined;
    color?: string | undefined;
    isExpanded?: boolean | undefined;
    sortOrder?: number | undefined;
}>;
export declare const createPageSchema: z.ZodObject<{
    name: z.ZodString;
    folderId: z.ZodString;
    blocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]>;
        content: z.ZodUnion<[z.ZodString, z.ZodObject<{
            elements: z.ZodArray<z.ZodUnknown, "many">;
            appState: z.ZodOptional<z.ZodUnknown>;
            version: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }>, z.ZodNull]>;
        attrs: z.ZodOptional<z.ZodObject<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    name: string;
    folderId: string;
    blocks?: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[] | undefined;
}, {
    name: string;
    folderId: string;
    blocks?: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[] | undefined;
}>;
export declare const updatePageSchema: z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    folderId: z.ZodOptional<z.ZodString>;
    content: z.ZodOptional<z.ZodString>;
    blocks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]>;
        content: z.ZodUnion<[z.ZodString, z.ZodObject<{
            elements: z.ZodArray<z.ZodUnknown, "many">;
            appState: z.ZodOptional<z.ZodUnknown>;
            version: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }>, z.ZodNull]>;
        attrs: z.ZodOptional<z.ZodObject<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }>, "many">>;
    isPublic: z.ZodOptional<z.ZodBoolean>;
    sortOrder: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    sortOrder?: number | undefined;
    folderId?: string | undefined;
    content?: string | undefined;
    blocks?: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[] | undefined;
    isPublic?: boolean | undefined;
}, {
    name?: string | undefined;
    sortOrder?: number | undefined;
    folderId?: string | undefined;
    content?: string | undefined;
    blocks?: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[] | undefined;
    isPublic?: boolean | undefined;
}>;
export declare const savePageSchema: z.ZodObject<{
    blocks: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "heading", "canvas", "ai", "image", "code", "list", "quote"]>;
        content: z.ZodUnion<[z.ZodString, z.ZodObject<{
            elements: z.ZodArray<z.ZodUnknown, "many">;
            appState: z.ZodOptional<z.ZodUnknown>;
            version: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }, {
            version: number;
            elements: unknown[];
            appState?: unknown;
        }>, z.ZodNull]>;
        attrs: z.ZodOptional<z.ZodObject<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough">>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }, {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }>, "many">;
    ydocState: z.ZodOptional<z.ZodString>;
    expectedVersion: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    blocks: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectOutputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[];
    expectedVersion: number;
    ydocState?: string | undefined;
}, {
    blocks: {
        id: string;
        content: string | {
            version: number;
            elements: unknown[];
            appState?: unknown;
        } | null;
        type: "text" | "heading" | "canvas" | "ai" | "image" | "code" | "list" | "quote";
        attrs?: z.objectInputType<{
            level: z.ZodOptional<z.ZodUnion<[z.ZodLiteral<1>, z.ZodLiteral<2>, z.ZodLiteral<3>, z.ZodLiteral<4>, z.ZodLiteral<5>, z.ZodLiteral<6>]>>;
            language: z.ZodOptional<z.ZodString>;
            listType: z.ZodOptional<z.ZodEnum<["bullet", "ordered", "task"]>>;
            checked: z.ZodOptional<z.ZodBoolean>;
            alt: z.ZodOptional<z.ZodString>;
            src: z.ZodOptional<z.ZodString>;
            aiPrompt: z.ZodOptional<z.ZodString>;
            aiModel: z.ZodOptional<z.ZodString>;
        }, z.ZodTypeAny, "passthrough"> | undefined;
    }[];
    expectedVersion: number;
    ydocState?: string | undefined;
}>;
export declare const addCollaboratorSchema: z.ZodObject<{
    userId: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["viewer", "editor", "admin"]>>;
}, "strip", z.ZodTypeAny, {
    userId: string;
    role: "editor" | "viewer" | "admin";
}, {
    userId: string;
    role?: "editor" | "viewer" | "admin" | undefined;
}>;
export declare function sanitizeContent(content: string): string;
export declare function sanitizeBlocks(blocks: z.infer<typeof blockSchema>[]): z.infer<typeof blockSchema>[];
export type Block = z.infer<typeof blockSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type UpdateFolderInput = z.infer<typeof updateFolderSchema>;
export type CreatePageInput = z.infer<typeof createPageSchema>;
export type UpdatePageInput = z.infer<typeof updatePageSchema>;
export type SavePageInput = z.infer<typeof savePageSchema>;
export type AddCollaboratorInput = z.infer<typeof addCollaboratorSchema>;
//# sourceMappingURL=validation.d.ts.map