const NODE_TYPES = {
    ENEMY: 'enemy',
    SHOP: 'shop',
    INFIRMARY: 'infirmary',
    TOWER: 'tower',
    UPGRADE: 'upgrade',
    START: 'start',
};

const DEFAULT_ENEMY_SEQUENCE = [
    {
        enemyIndex: 0,
        rewardGold: 50,
        label: 'Battle',
        start: true
    },
    {
        enemyIndex: 1,
        rewardGold: 70,
        label: 'Battle'
    },
    {
        enemyIndex: 2,
        rewardGold: 100,
        label: 'Battle'
    },
    {
        enemyIndex: 3,
        rewardGold: 150,
        label: 'Boss',
        isBoss: true
    }
];

export class PathManager {
    constructor({ enemySequence, allowUpgradeNodes = false, upgradeNodeMinEnemyIndex = 1 } = {}, randomSource = Math.random) {
        this.randomFn = typeof randomSource === 'function' ? randomSource : Math.random;
        this.nodes = [];
        this.nodeMap = new Map();
        this.currentNodeId = null;
        this.completedNodeIds = new Set();
        this.previousFrontier = [];
        this.enemySequence = Array.isArray(enemySequence) && enemySequence.length > 0
            ? enemySequence.map(entry => ({ ...entry }))
            : DEFAULT_ENEMY_SEQUENCE.map(entry => ({ ...entry }));
        this.allowUpgradeNodes = !!allowUpgradeNodes;
        this.upgradeNodeMinEnemyIndex = Number.isFinite(upgradeNodeMinEnemyIndex)
            ? Math.max(0, upgradeNodeMinEnemyIndex)
            : 1;

        this.generatePath();

        // Mark START node as completed FIRST
        const startNode = this.nodes.find(node => node.type === NODE_TYPES.START);
        if (startNode && startNode.id) {
            this.completedNodeIds.add(startNode.id);
        }

        // THEN set frontier to first battle nodes (children of START node)
        if (startNode && Array.isArray(startNode.connections) && startNode.connections.length > 0) {
            this.frontier = [...startNode.connections];
        } else {
            // Fallback: find row 0 nodes
            this.frontier = this.nodes
                .filter(node => node.row === 0 && node.type !== NODE_TYPES.START)
                .map(node => node.id);
        }
        
        if (this.frontier.length === 0 && this.nodes.length > 0) {
            this.frontier = [this.nodes[0].id];
        }
    }

    getFacilityTypesForEnemyIndex(enemyIndex) {
        const facilityTypes = [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY, NODE_TYPES.TOWER];

        if (this.allowUpgradeNodes && enemyIndex >= this.upgradeNodeMinEnemyIndex) {
            facilityTypes.push(NODE_TYPES.UPGRADE);
        }

        return facilityTypes;
    }

    generatePath() {
        this.nodes = [];
        this.nodeMap = new Map();

        const LEVEL_COUNT = 7;
        const columnLayouts = {
            1: [1],
            2: [0.5, 1.5],
            3: [0, 1, 2]
        };

        const locationTypesBase = [NODE_TYPES.SHOP, NODE_TYPES.INFIRMARY, NODE_TYPES.TOWER];
        if (this.allowUpgradeNodes) {
            locationTypesBase.push(NODE_TYPES.UPGRADE);
        }

        const enemyEntries = this.enemySequence.filter(entry => !entry.isBoss);
        const bossEntry = this.enemySequence.find(entry => entry.isBoss)
            || this.enemySequence[this.enemySequence.length - 1]
            || {
                enemyIndex: enemyEntries.length,
                rewardGold: 200,
                label: 'Boss',
                isBoss: true
            };

        let battleStageCursor = 0;

        const createLabelForType = type => {
            switch (type) {
                case NODE_TYPES.SHOP:
                    return 'Shop';
                case NODE_TYPES.INFIRMARY:
                    return 'Infirmary';
                case NODE_TYPES.TOWER:
                    return 'Tower of Ten';
                case NODE_TYPES.UPGRADE:
                    return 'Upgrade Dice';
                default:
                    return 'Visit';
            }
        };

        const getBattleEntryForStage = () => {
            if (enemyEntries.length > 0) {
                return enemyEntries[Math.min(battleStageCursor, enemyEntries.length - 1)];
            }

            return {
                enemyIndex: battleStageCursor,
                rewardGold: 50,
                label: 'Battle'
            };
        };

        const assignBattleDataToNodes = (nodes, { isStart = false } = {}) => {
            const targetNodes = Array.isArray(nodes) ? nodes.filter(Boolean) : [];

            if (targetNodes.length === 0) {
                return;
            }

            const enemyData = getBattleEntryForStage();
            const enemyIndex = Number.isFinite(enemyData?.enemyIndex)
                ? enemyData.enemyIndex
                : battleStageCursor;
            const rewardGold = Number.isFinite(enemyData?.rewardGold)
                ? enemyData.rewardGold
                : 50;
            const label = enemyData?.label || 'Battle';

            targetNodes.forEach(node => {
                node.type = NODE_TYPES.ENEMY;
                node.label = label;
                node.enemyIndex = enemyIndex;
                node.rewardGold = rewardGold;
                node.isBoss = false;
                node.start = node.start === true || isStart;
                node.connections = Array.isArray(node.connections) ? node.connections : [];
            });

            battleStageCursor += 1;
        };

        const createLocationNodes = (levelIndex, nodeCount) => {
            const typeCounts = new Map();
            const maxDuplicatesPerType = 2;

            const chooseLocationType = () => {
                const pool = locationTypesBase.slice();
                while (pool.length > 0) {
                    const index = Math.floor(this.randomFn() * pool.length);
                    const candidate = pool.splice(index, 1)[0];
                    const currentCount = typeCounts.get(candidate) || 0;
                    if (currentCount < maxDuplicatesPerType) {
                        typeCounts.set(candidate, currentCount + 1);
                        return candidate;
                    }
                }

                let fallbackType = locationTypesBase[0];
                let lowestCount = Number.POSITIVE_INFINITY;
                locationTypesBase.forEach(type => {
                    const count = typeCounts.get(type) || 0;
                    if (count < lowestCount) {
                        lowestCount = count;
                        fallbackType = type;
                    }
                });
                typeCounts.set(fallbackType, (typeCounts.get(fallbackType) || 0) + 1);
                return fallbackType;
            };

            const columns = columnLayouts[nodeCount];
            return Array.from({ length: nodeCount }, (_, nodeIndex) => {
                const type = chooseLocationType();
                return {
                    id: `node-${levelIndex}-${nodeIndex}`,
                    type,
                    label: createLabelForType(type),
                    connections: [],
                    row: levelIndex,
                    column: columns ? columns[nodeIndex] : nodeIndex,
                    start: false,
                    isBoss: false
                };
            });
        };

        const ensureConnection = (node, targetId) => {
            if (!node || !targetId) {
                return;
            }
            node.connections = Array.isArray(node.connections) ? node.connections : [];
            if (!node.connections.includes(targetId)) {
                node.connections.push(targetId);
            }
        };

        const levels = [];
        let bossNode = null;

        // NEW: Add START node at row -1 (above everything)
        const startNode = {
            id: 'node-start-0',
            type: NODE_TYPES.START,
            label: 'Start',
            row: -1,
            column: 1,
            connections: [],
            start: true,
            isBoss: false
        };

        const findNodeById = targetId => {
            if (!targetId) {
                return null;
            }
            for (const level of levels) {
                const found = level.nodes.find(node => node.id === targetId);
                if (found) {
                    return found;
                }
            }
            if (bossNode && bossNode.id === targetId) {
                return bossNode;
            }
            return null;
        };

        const safeEnsureConnection = (parent, child) => {
            if (!parent || !child) {
                return false;
            }
            if (child.type !== NODE_TYPES.ENEMY) {
                const existing = (parent.connections || [])
                    .map(connectionId => findNodeById(connectionId))
                    .filter(target => target && target.type !== NODE_TYPES.ENEMY && target.id !== child.id);
                if (existing.some(target => target.type === child.type)) {
                    return false;
                }
            }
            ensureConnection(parent, child.id);
            return true;
        };

        const updateNodeType = (node, newType) => {
            if (!node) {
                return;
            }
            node.type = newType;
            node.label = createLabelForType(newType);
            delete node.enemyIndex;
            delete node.rewardGold;
            node.isBoss = false;
        };

        const adjustChildTypeForParents = (child, parents) => {
            if (!child || child.type === NODE_TYPES.ENEMY) {
                return false;
            }
            const disallowed = new Set([child.type]);
            parents.filter(Boolean).forEach(parent => {
                if (parent.type !== NODE_TYPES.ENEMY) {
                    disallowed.add(parent.type);
                }
                (parent.connections || []).forEach(connectionId => {
                    if (connectionId === child.id) {
                        return;
                    }
                    const sibling = findNodeById(connectionId);
                    if (sibling && sibling.type !== NODE_TYPES.ENEMY) {
                        disallowed.add(sibling.type);
                    }
                });
            });

            const candidates = locationTypesBase.filter(type => !disallowed.has(type));
            if (candidates.length === 0) {
                return false;
            }
            const newType = candidates[Math.floor(this.randomFn() * candidates.length)];
            updateNodeType(child, newType);
            return true;
        };

        const assignChildToParents = (child, parentCandidates) => {
            if (!child || !Array.isArray(parentCandidates) || parentCandidates.length === 0) {
                return;
            }
            const parents = parentCandidates.filter(Boolean);
            if (parents.length === 0) {
                return;
            }

            const candidates = parents.slice();
            if (candidates.length > 1 && this.randomFn() < 0.5) {
                candidates.reverse();
            }

            let connectedParents = 0;
            candidates.forEach((parent, index) => {
                if (!parent) {
                    return;
                }
                if (safeEnsureConnection(parent, child)) {
                    connectedParents += 1;
                    return;
                }
                const adjusted = adjustChildTypeForParents(child, parents);
                if (adjusted && safeEnsureConnection(parent, child)) {
                    connectedParents += 1;
                }
            });

            if (connectedParents === 0) {
                const fallback = candidates[0];
                if (fallback) {
                    ensureConnection(fallback, child.id);
                }
                connectedParents = 1;
            }

        };

        const resolveAdjacentLocationConflicts = () => {
            for (let levelIndex = 1; levelIndex < LEVEL_COUNT; levelIndex += 1) {
                const upperLevel = levels[levelIndex - 1];
                const lowerLevel = levels[levelIndex];

                const parentsByChildId = new Map();
                upperLevel.nodes.forEach(parent => {
                    (parent.connections || []).forEach(childId => {
                        const list = parentsByChildId.get(childId) || [];
                        list.push(parent);
                        parentsByChildId.set(childId, list);
                    });
                });

                lowerLevel.nodes.forEach(child => {
                    if (child.type === NODE_TYPES.ENEMY) {
                        return;
                    }
                    const parents = parentsByChildId.get(child.id) || [];
                    if (parents.length === 0) {
                        return;
                    }
                    const hasConflict = parents.some(parent => parent.type !== NODE_TYPES.ENEMY && parent.type === child.type);
                    if (!hasConflict) {
                        return;
                    }

                    const disallowed = new Set([child.type]);
                    parents.forEach(parent => {
                        if (parent.type !== NODE_TYPES.ENEMY) {
                            disallowed.add(parent.type);
                        }
                        (parent.connections || []).forEach(connectionId => {
                            if (connectionId === child.id) {
                                return;
                            }
                            const sibling = findNodeById(connectionId);
                            if (sibling && sibling.type !== NODE_TYPES.ENEMY) {
                                disallowed.add(sibling.type);
                            }
                        });
                    });

                    const candidates = locationTypesBase.filter(type => !disallowed.has(type));
                    if (candidates.length === 0) {
                        return;
                    }
                    const newType = candidates[Math.floor(this.randomFn() * candidates.length)];
                    updateNodeType(child, newType);
                });
            }
        };

        const pruneNodeConnections = () => {
            const incomingCounts = new Map();
            const registerIncoming = targetId => {
                if (!targetId) {
                    return;
                }
                const current = incomingCounts.get(targetId) || 0;
                incomingCounts.set(targetId, current + 1);
            };

            levels.forEach(level => {
                level.nodes.forEach(node => {
                    if (!Array.isArray(node.connections)) {
                        return;
                    }
                    node.connections.forEach(registerIncoming);
                });
            });

            if (bossNode && Array.isArray(bossNode.connections)) {
                bossNode.connections.forEach(registerIncoming);
            }

            levels.forEach(level => {
                level.nodes.forEach(node => {
                    if (!Array.isArray(node.connections)) {
                        return;
                    }

                    if (node.connections.length <= 1) {
                        return;
                    }

                    if (this.randomFn() >= 0.2) {
                        return;
                    }

                    const removable = node.connections
                        .map((childId, index) => ({ childId, index }))
                        .filter(({ childId }) => (incomingCounts.get(childId) || 0) > 1);

                    if (removable.length === 0) {
                        return;
                    }

                    const choice = removable[Math.floor(this.randomFn() * removable.length)];
                    node.connections.splice(choice.index, 1);
                    const remaining = Math.max((incomingCounts.get(choice.childId) || 1) - 1, 0);
                    incomingCounts.set(choice.childId, remaining);
                });
            });
        };

        const nodeCountHistory = [];
        const generateNodeCount = () => {
            let candidate = this.randomFn() < 0.5 ? 2 : 3;
            if (nodeCountHistory.length >= 2) {
                const last = nodeCountHistory[nodeCountHistory.length - 1];
                const previous = nodeCountHistory[nodeCountHistory.length - 2];
                if (last === previous) {
                    candidate = last === 2 ? 3 : 2;
                }
            }
            nodeCountHistory.push(candidate);
            return candidate;
        };

        // Level 0: battle nodes only.
        const firstLevelCount = generateNodeCount();
        const firstLevelColumns = columnLayouts[firstLevelCount];
        const firstLevelNodes = firstLevelColumns.map((column, nodeIndex) => ({
            id: `node-0-${nodeIndex}`,
            row: 0,
            column,
            connections: [],
            start: false,
            isBoss: false
        }));

        assignBattleDataToNodes(firstLevelNodes, { isStart: true });
        levels.push({ nodes: firstLevelNodes, row: 0 });

        // Levels 1-6: start as location nodes.
        for (let levelIndex = 1; levelIndex < LEVEL_COUNT; levelIndex += 1) {
            const nodeCount = generateNodeCount();
            const nodes = createLocationNodes(levelIndex, nodeCount);
            levels.push({ nodes, row: levelIndex });
        }

        // Ensure at least one of levels 1-6 has three nodes.
        if (!levels.slice(1).some(level => level.nodes.length === 3)) {
            const targetIndex = 1 + Math.floor(this.randomFn() * 6);
            const level = levels[targetIndex];
            if (level.nodes.length === 2) {
                const columns = columnLayouts[3];
                const sortedNodes = level.nodes.slice().sort((a, b) => a.column - b.column);
                if (sortedNodes[0]) {
                    sortedNodes[0].column = columns[0];
                }
                if (sortedNodes[1]) {
                    sortedNodes[1].column = columns[2];
                }
                const existingCounts = new Map();
                level.nodes.forEach(node => {
                    if (node.type === NODE_TYPES.ENEMY) {
                        return;
                    }
                    existingCounts.set(node.type, (existingCounts.get(node.type) || 0) + 1);
                });
                const candidateTypes = locationTypesBase.filter(type => (existingCounts.get(type) || 0) < 2);
                const newTypePool = candidateTypes.length > 0 ? candidateTypes : locationTypesBase;
                const newType = newTypePool[Math.floor(this.randomFn() * newTypePool.length)] || locationTypesBase[0];
                const newNode = {
                    id: `node-${targetIndex}-${level.nodes.length}`,
                    type: newType,
                    label: createLabelForType(newType),
                    connections: [],
                    row: targetIndex,
                    column: columns[1],
                    start: false,
                    isBoss: false
                };
                level.nodes.push(newNode);
            }
        }

        const candidateLevelIndices = [1, 2, 3, 4, 5, 6];
        let selectedLevelIndices = null;
        const attempts = 200;

        const formsConsecutiveTriple = indices => {
            if (!Array.isArray(indices) || indices.length < 3) {
                return false;
            }
            const sorted = indices.slice().sort((a, b) => a - b);
            return sorted[2] - sorted[0] === 2 && sorted[1] - sorted[0] === 1;
        };

        const sampleThreeLevels = () => {
            const pool = candidateLevelIndices.slice();
            const sample = [];
            while (sample.length < 3 && pool.length > 0) {
                const index = Math.floor(this.randomFn() * pool.length);
                sample.push(pool.splice(index, 1)[0]);
            }
            return sample;
        };

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            const sample = sampleThreeLevels();
            if (sample.length < 3) {
                continue;
            }
            const hasThreeNodeLevel = sample.some(index => levels[index].nodes.length === 3);
            const earlyBattleCount = sample.filter(index => index >= 1 && index <= 4).length;
            if (hasThreeNodeLevel && !formsConsecutiveTriple(sample) && earlyBattleCount >= 2) {
                selectedLevelIndices = sample;
                break;
            }
        }

        if (!selectedLevelIndices) {
            const threeNodeIndices = candidateLevelIndices.filter(index => levels[index].nodes.length === 3);
            const baseIndex = threeNodeIndices.length > 0
                ? threeNodeIndices[Math.floor(this.randomFn() * threeNodeIndices.length)]
                : candidateLevelIndices[0];
            selectedLevelIndices = [baseIndex];
            const remaining = candidateLevelIndices.filter(index => index !== baseIndex);
            while (selectedLevelIndices.length < 3 && remaining.length > 0) {
                const index = Math.floor(this.randomFn() * remaining.length);
                const candidate = remaining.splice(index, 1)[0];
                const tentative = selectedLevelIndices.concat(candidate);
                if ((tentative.length < 3 || !formsConsecutiveTriple(tentative))) {
                    selectedLevelIndices.push(candidate);
                }
            }
            while (selectedLevelIndices.length < 3) {
                const fallback = candidateLevelIndices.find(index => !selectedLevelIndices.includes(index));
                if (typeof fallback === 'number') {
                    selectedLevelIndices.push(fallback);
                } else {
                    break;
                }
            }
            selectedLevelIndices = selectedLevelIndices.slice(0, 3);
            const ensureEarlyCoverage = () => {
                let earlyCount = selectedLevelIndices.filter(index => index >= 1 && index <= 4).length;
                const availableEarly = candidateLevelIndices
                    .filter(index => index >= 1 && index <= 4 && !selectedLevelIndices.includes(index));
                while (earlyCount < 2 && availableEarly.length > 0) {
                    const replacementIndex = selectedLevelIndices.findIndex(index => index > 4);
                    if (replacementIndex === -1) {
                        break;
                    }
                    const newIndex = availableEarly.splice(Math.floor(this.randomFn() * availableEarly.length), 1)[0];
                    selectedLevelIndices[replacementIndex] = newIndex;
                    earlyCount = selectedLevelIndices.filter(index => index >= 1 && index <= 4).length;
                }
                if (formsConsecutiveTriple(selectedLevelIndices)) {
                    const available = candidateLevelIndices.filter(index => !selectedLevelIndices.includes(index));
                    for (let i = 0; i < selectedLevelIndices.length; i += 1) {
                        const current = selectedLevelIndices[i];
                        if (current >= 1 && current <= 4 && earlyCount <= 2) {
                            continue;
                        }
                        const alternatives = available.filter(index => index !== current);
                        while (alternatives.length > 0) {
                            const idx = Math.floor(this.randomFn() * alternatives.length);
                            const alternative = alternatives.splice(idx, 1)[0];
                            const temp = selectedLevelIndices.slice();
                            temp[i] = alternative;
                            if (!formsConsecutiveTriple(temp)) {
                                selectedLevelIndices = temp;
                                return;
                            }
                        }
                    }
                }
            };
            ensureEarlyCoverage();
        }

        const threeNodeLevels = selectedLevelIndices.filter(index => levels[index].nodes.length === 3);
        const primaryThreeNodeLevelIndex = threeNodeLevels.length > 0
            ? threeNodeLevels[Math.floor(this.randomFn() * threeNodeLevels.length)]
            : selectedLevelIndices[0];

        const remainingBattleLevels = selectedLevelIndices.filter(index => index !== primaryThreeNodeLevelIndex);
        const battleReplacementCounts = this.randomFn() < 0.5 ? [1, 2] : [2, 1];

        const chooseNodeIndices = (level, count) => {
            const available = level.nodes.map((_, idx) => idx);
            if (count >= available.length) {
                return available;
            }
            const chosen = [];
            const pool = available.slice();
            while (chosen.length < count && pool.length > 0) {
                const index = Math.floor(this.randomFn() * pool.length);
                chosen.push(pool.splice(index, 1)[0]);
            }
            return chosen;
        };

        const pendingBattleAssignments = [];

        const convertLevelNodesToBattles = (levelIndex, count) => {
            if (count <= 0) {
                return;
            }
            const level = levels[levelIndex];
            const indices = chooseNodeIndices(level, count);
            const nodesToConvert = indices
                .map(nodeIndex => level.nodes[nodeIndex])
                .filter(Boolean);
            if (nodesToConvert.length === 0) {
                return;
            }
            pendingBattleAssignments.push({ levelIndex, nodes: nodesToConvert });
        };

        // Primary three-node level gets two battle nodes.
        convertLevelNodesToBattles(primaryThreeNodeLevelIndex, Math.min(2, levels[primaryThreeNodeLevelIndex].nodes.length));

        // Remaining two levels get 1 and 2 battle nodes respectively.
        remainingBattleLevels.forEach((levelIndex, idx) => {
            const count = battleReplacementCounts[idx] || 1;
            convertLevelNodesToBattles(levelIndex, Math.min(count, levels[levelIndex].nodes.length));
        });

        pendingBattleAssignments
            .sort((a, b) => a.levelIndex - b.levelIndex)
            .forEach(({ nodes }) => {
                assignBattleDataToNodes(nodes, { isStart: false });
            });

        const forceConnect = (parent, child, parentsForAdjustment = null) => {
            if (!parent || !child) {
                return false;
            }

            let parentList = Array.isArray(parentsForAdjustment)
                ? parentsForAdjustment.filter(Boolean)
                : [];

            if (parentList.length === 0) {
                parentList = [parent];
            }

            if (safeEnsureConnection(parent, child)) {
                return true;
            }

            if (adjustChildTypeForParents(child, parentList) && safeEnsureConnection(parent, child)) {
                return true;
            }

            return false;
        };

        const connectLevels = (upperLevel, lowerLevel) => {
            const upperNodes = upperLevel.nodes.slice().sort((a, b) => a.column - b.column);
            const lowerNodes = lowerLevel.nodes.slice().sort((a, b) => a.column - b.column);
            const upperCount = upperNodes.length;
            const lowerCount = lowerNodes.length;

            if (upperCount === 0 || lowerCount === 0) {
                return;
            }

            if (upperCount === 2 && lowerCount === 3) {
                const [topLeft, topRight] = upperNodes;
                const [bottomLeft, bottomMiddle, bottomRight] = lowerNodes;
                assignChildToParents(bottomLeft, [topLeft]);
                assignChildToParents(bottomRight, [topRight]);
                assignChildToParents(bottomMiddle, [topLeft, topRight]);
            } else if (upperCount === 3 && lowerCount === 2) {
                const [topLeft, topMiddle, topRight] = upperNodes;
                const [bottomLeft, bottomRight] = lowerNodes;
                assignChildToParents(bottomLeft, [topLeft, topMiddle]);
                assignChildToParents(bottomRight, [topRight, topMiddle]);
            } else if (upperCount === 2 && lowerCount === 2) {
                const [topLeft, topRight] = upperNodes;
                const [bottomLeft, bottomRight] = lowerNodes;
                const parentSet = [topLeft, topRight];

                if (!forceConnect(topLeft, bottomLeft, parentSet)) {
                    ensureConnection(topLeft, bottomLeft.id);
                }

                if (!forceConnect(topRight, bottomRight, parentSet)) {
                    ensureConnection(topRight, bottomRight.id);
                }
            } else if (upperCount === 3 && lowerCount === 3) {
                const [topLeft, topMiddle, topRight] = upperNodes;
                const [bottomLeft, bottomMiddle, bottomRight] = lowerNodes;
                const connectCenterToAll = this.randomFn() < 0.5;

                if (connectCenterToAll) {
                    const leftParents = [topLeft, topMiddle];
                    const rightParents = [topRight, topMiddle];

                    if (!forceConnect(topLeft, bottomLeft, leftParents)) {
                        ensureConnection(topLeft, bottomLeft.id);
                    }

                    if (!forceConnect(topMiddle, bottomLeft, leftParents)) {
                        ensureConnection(topMiddle, bottomLeft.id);
                    }

                    const middleParents = [topLeft, topMiddle, topRight];
                    if (!forceConnect(topMiddle, bottomMiddle, middleParents)) {
                        ensureConnection(topMiddle, bottomMiddle.id);
                    }

                    if (!forceConnect(topMiddle, bottomRight, rightParents)) {
                        ensureConnection(topMiddle, bottomRight.id);
                    }

                    if (!forceConnect(topRight, bottomRight, rightParents)) {
                        ensureConnection(topRight, bottomRight.id);
                    }
                } else {
                    const leftParents = [topLeft, topMiddle];
                    const middleParents = [topLeft, topMiddle, topRight];
                    const rightParents = [topRight, topMiddle];

                    if (!forceConnect(topLeft, bottomLeft, leftParents)) {
                        ensureConnection(topLeft, bottomLeft.id);
                    }

                    if (!forceConnect(topMiddle, bottomMiddle, middleParents)) {
                        ensureConnection(topMiddle, bottomMiddle.id);
                    }
                    if (!forceConnect(topLeft, bottomMiddle, middleParents)) {
                        ensureConnection(topLeft, bottomMiddle.id);
                    }
                    if (!forceConnect(topRight, bottomMiddle, middleParents)) {
                        ensureConnection(topRight, bottomMiddle.id);
                    }

                    if (!forceConnect(topRight, bottomRight, rightParents)) {
                        ensureConnection(topRight, bottomRight.id);
                    }
                }
            } else {
                lowerNodes.forEach(child => {
                    const orderedParents = upperNodes.slice().sort((a, b) => Math.abs(a.column - child.column) - Math.abs(b.column - child.column));
                    assignChildToParents(child, orderedParents);
                });
            }

            upperNodes.forEach(parent => {
                const hasConnection = Array.isArray(parent.connections) && parent.connections.length > 0;
                if (hasConnection) {
                    return;
                }
                const orderedChildren = lowerNodes.slice().sort((a, b) => Math.abs(a.column - parent.column) - Math.abs(b.column - parent.column));
                for (const child of orderedChildren) {
                    if (safeEnsureConnection(parent, child)) {
                        return;
                    }
                    const adjusted = adjustChildTypeForParents(child, [parent]);
                    if (adjusted && safeEnsureConnection(parent, child)) {
                        return;
                    }
                }
                if (orderedChildren[0]) {
                    ensureConnection(parent, orderedChildren[0].id);
                }
            });
        };

        for (let levelIndex = 0; levelIndex < LEVEL_COUNT - 1; levelIndex += 1) {
            const upperLevel = levels[levelIndex];
            const lowerLevel = levels[levelIndex + 1];
            connectLevels(upperLevel, lowerLevel);
        }

        // Create the boss node and connect final level nodes to it.
        bossNode = {
            id: 'boss-node',
            type: NODE_TYPES.ENEMY,
            label: bossEntry.label || 'Boss',
            enemyIndex: bossEntry.enemyIndex,
            rewardGold: bossEntry.rewardGold,
            isBoss: true,
            start: false,
            row: LEVEL_COUNT,
            column: 1,
            connections: []
        };

        const finalLevel = levels[LEVEL_COUNT - 1];
        finalLevel.nodes.forEach(node => {
            ensureConnection(node, bossNode.id);
        });

        resolveAdjacentLocationConflicts();
        pruneNodeConnections();

        // Connect START node to all nodes in level 0
        firstLevelNodes.forEach(node => {
            ensureConnection(startNode, node.id);
        });

        this.addNode(startNode);

        levels.forEach(level => {
            level.nodes.forEach(node => {
                this.addNode(node);
            });
        });

        this.addNode(bossNode);
    }

    addNode(node) {
        this.nodes.push(node);
        this.nodeMap.set(node.id, node);
    }

    getNodes() {
        return this.nodes;
    }

    getNode(nodeId) {
        return this.nodeMap.get(nodeId) || null;
    }

    getAvailableNodeIds() {
        return [...this.frontier];
    }

    beginNode(nodeId) {
        if (!this.nodeMap.has(nodeId)) {
            return;
        }

        this.previousFrontier = [...this.frontier];
        const index = this.frontier.indexOf(nodeId);
        if (index >= 0) {
            this.frontier.splice(index, 1);
        }
        this.currentNodeId = nodeId;
    }

    completeNode(nodeId) {
        if (!nodeId || !this.nodeMap.has(nodeId)) {
            return [];
        }

        this.completedNodeIds.add(nodeId);
        if (this.currentNodeId === nodeId) {
            this.currentNodeId = null;
        }

        this.previousFrontier = [];

        const node = this.nodeMap.get(nodeId);
        const nextIds = (node.connections || []).filter(nextId => !this.completedNodeIds.has(nextId));
        this.frontier = nextIds;
        return nextIds;
    }

    completeCurrentNode() {
        return this.completeNode(this.currentNodeId);
    }

    isNodeCompleted(nodeId) {
        return this.completedNodeIds.has(nodeId);
    }

    getCurrentNodeId() {
        return this.currentNodeId;
    }

    hasPendingNodes() {
        return this.frontier.length > 0;
    }
}

export const PATH_NODE_TYPES = NODE_TYPES;
export const DEFAULT_PATH_ENEMY_SEQUENCE = DEFAULT_ENEMY_SEQUENCE;
