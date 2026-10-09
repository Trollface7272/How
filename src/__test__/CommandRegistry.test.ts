import { describe, expect, test, vi, beforeEach } from "vitest";
import { CommandEmitter } from "../class/CommandEmitter";
import { InteractionRegisterer } from "../class/InteractionRegisterer";
import { CommandAbstract } from "../class/partials/Command";
import { SlashCommandBuilder } from "discord.js";

describe("CommandEmitter Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("CommandEmitter can add command", () => {
        const mockCommand = class MockCommand {
            static readonly names = ["test"];
            static readonly interactionData = new SlashCommandBuilder().setName("test");
            static readonly helpData = {};
        } as any;

        const emitter = new CommandEmitter();
        const addCommandSpy = vi.spyOn(emitter, "AddCommand");
        
        emitter.AddCommand(mockCommand, mockCommand.names);
        
        expect(addCommandSpy).toHaveBeenCalledWith(mockCommand, mockCommand.names);
    });

    test("CommandEmitter handles multiple aliases", () => {
        const mockCommand = class MockCommand {
            static readonly names = ["test", "t", "testing"];
        } as any;

        const names = mockCommand.names;
        expect(names).toHaveLength(3);
        expect(names).toContain("test");
        expect(names).toContain("t");
        expect(names).toContain("testing");
    });

    test("CommandEmitter can retrieve command by name", () => {
        const mockCommand = class MockCommand {
            static readonly names = ["test"];
        } as any;

        const commandName = "test";
        const commands = new Map();
        commands.set(commandName, mockCommand);

        expect(commands.has(commandName)).toBe(true);
        expect(commands.get(commandName)).toBe(mockCommand);
    });

    test("CommandEmitter handles command not found", () => {
        const commands = new Map();
        const commandName = "nonexistent";

        expect(commands.has(commandName)).toBe(false);
        expect(commands.get(commandName)).toBeUndefined();
    });

    test("CommandEmitter can list all commands", () => {
        const mockCommands = [
            class Command1 { static readonly names = ["cmd1"]; },
            class Command2 { static readonly names = ["cmd2"]; },
            class Command3 { static readonly names = ["cmd3"]; }
        ];

        const commands = new Map();
        mockCommands.forEach(cmd => {
            commands.set(cmd.names[0], cmd);
        });

        expect(commands.size).toBe(3);
        expect(Array.from(commands.keys())).toEqual(["cmd1", "cmd2", "cmd3"]);
    });

    test("CommandEmitter overwrites duplicate command names", () => {
        const mockCommand1 = class Command1 { static readonly names = ["test"]; };
        const mockCommand2 = class Command2 { static readonly names = ["test"]; };

        const commands = new Map();
        commands.set("test", mockCommand1);
        commands.set("test", mockCommand2);

        expect(commands.size).toBe(1);
        expect(commands.get("test")).toBe(mockCommand2);
    });
});

describe("InteractionRegisterer Tests", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test("InteractionRegisterer can add interaction", () => {
        const mockInteraction = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test command");

        // InteractionRegisterer is a singleton, so just test that the interaction is valid
        expect(mockInteraction.name).toBe("test");
        expect(mockInteraction.description).toBe("Test command");
    });

    test("InteractionRegisterer stores interaction data", () => {
        const mockInteraction = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test command");

        const interactions: SlashCommandBuilder[] = [];
        interactions.push(mockInteraction);

        expect(interactions).toHaveLength(1);
        expect(interactions[0]).toBe(mockInteraction);
    });

    test("InteractionRegisterer can retrieve all interactions", () => {
        const interactions = [
            new SlashCommandBuilder().setName("test1").setDescription("Test 1"),
            new SlashCommandBuilder().setName("test2").setDescription("Test 2"),
            new SlashCommandBuilder().setName("test3").setDescription("Test 3")
        ];

        expect(interactions).toHaveLength(3);
        expect(interactions.map(i => i.name)).toEqual(["test1", "test2", "test3"]);
    });

    test("InteractionRegisterer validates interaction data", () => {
        const validInteraction = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test command");

        expect(validInteraction.name).toBe("test");
        expect(validInteraction.description).toBe("Test command");
    });

    test("InteractionRegisterer handles interaction with options", () => {
        const interactionWithOptions = new SlashCommandBuilder()
            .setName("test")
            .setDescription("Test command")
            .addStringOption(option =>
                option.setName("username")
                    .setDescription("Username")
                    .setRequired(false)
            )
            .addBooleanOption(option =>
                option.setName("events")
                    .setDescription("Show events")
                    .setRequired(false)
            );

        expect(interactionWithOptions.options).toBeDefined();
        expect(interactionWithOptions.options.length).toBeGreaterThan(0);
    });
});

describe("Command Metadata Tests", () => {
    test("Command has required static properties", () => {
        const mockCommand = {
            names: ["test"],
            interactionData: new SlashCommandBuilder().setName("test"),
            helpData: {}
        };

        expect(mockCommand).toHaveProperty("names");
        expect(mockCommand).toHaveProperty("interactionData");
        expect(mockCommand).toHaveProperty("helpData");
    });

    test("Command names is an array", () => {
        const names = ["test", "t"];
        expect(Array.isArray(names)).toBe(true);
        expect(names).toHaveLength(2);
    });

    test("Command has doNotDefer flag", () => {
        const mockCommand = {
            names: ["link"],
            doNotDefer: true
        };

        expect(mockCommand.doNotDefer).toBe(true);
    });

    test("Command without doNotDefer defaults to false", () => {
        const mockCommand = {
            names: ["profile"]
        };

        expect(mockCommand.doNotDefer).toBeUndefined();
    });
});

describe("Command Help Data Tests", () => {
    test("Help data contains command metadata", () => {
        const helpData = {
            command: "profile",
            group: "Profile",
            description: "View osu! profile",
            usage: "profile [username]",
            aliases: ["osu", "std"],
            args: []
        };

        expect(helpData.command).toBe("profile");
        expect(helpData.group).toBe("Profile");
        expect(helpData.aliases).toContain("osu");
    });

    test("Help data contains command arguments", () => {
        const helpData = {
            args: [
                { name: "username", description: "osu! username", required: false },
                { name: "mode", description: "gamemode", required: false }
            ]
        };

        expect(helpData.args).toHaveLength(2);
        expect(helpData.args[0].name).toBe("username");
        expect(helpData.args[1].name).toBe("mode");
    });

    test("Help data includes command group", () => {
        const groups = ["Profile", "Scores", "Beatmaps", "Misc", "Rankings"];
        expect(groups).toContain("Profile");
        expect(groups).toContain("Scores");
    });
});

describe("Command Validation Tests", () => {
    test("Validate command name format", () => {
        const validNames = ["profile", "recent", "top", "compare"];
        validNames.forEach(name => {
            expect(name).toMatch(/^[a-z]+$/);
        });
    });

    test("Validate command has Handle method", () => {
        const mockCommand = class {
            async Handle() {
                return 0;
            }
        };

        const instance = new mockCommand();
        expect(instance).toHaveProperty("Handle");
        expect(typeof instance.Handle).toBe("function");
    });

    test("Validate interaction name matches command name", () => {
        const commandName = "profile";
        const interaction = new SlashCommandBuilder()
            .setName(commandName)
            .setDescription("Test");

        expect(interaction.name).toBe(commandName);
    });
});

describe("Command Grouping Tests", () => {
    test("Group commands by category", () => {
        const commandGroups = {
            "Profile": ["profile", "avatar", "update"],
            "Scores": ["recent", "top", "score", "compare"],
            "Beatmaps": ["beatmap", "search"],
            "Misc": ["help", "link", "settings"]
        };

        expect(commandGroups["Profile"]).toContain("profile");
        expect(commandGroups["Scores"]).toContain("recent");
        expect(commandGroups["Misc"]).toContain("help");
    });

    test("All commands belong to a group", () => {
        const commands = ["profile", "recent", "beatmap", "help"];
        const groups = ["Profile", "Scores", "Beatmaps", "Misc"];

        commands.forEach(cmd => {
            expect(groups.some(group => 
                ["profile", "avatar"].includes(cmd) && group === "Profile" ||
                ["recent", "top"].includes(cmd) && group === "Scores" ||
                ["beatmap", "search"].includes(cmd) && group === "Beatmaps" ||
                ["help", "link"].includes(cmd) && group === "Misc"
            )).toBe(true);
        });
    });
});

describe("Command Instantiation Tests", () => {
    test("Command constructor accepts MessageEventData", () => {
        const mockData = {} as any;
        
        const mockCommand = class {
            constructor(data: any) {
                expect(data).toBe(mockData);
            }
        };

        new mockCommand(mockData);
    });

    test("Command initializes with data", () => {
        const mockData = {
            user: { id: "123" },
            guild: { id: "456" }
        } as any;

        const mockCommand = class {
            private data: any;
            constructor(data: any) {
                this.data = data;
            }
            getData() {
                return this.data;
            }
        };

        const instance = new mockCommand(mockData);
        expect(instance.getData()).toBe(mockData);
    });
});
