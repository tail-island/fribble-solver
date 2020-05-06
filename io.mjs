import fs from 'fs';

export function readQuestion(fd) {
    const question = JSON.parse(fs.readFileSync(fd));

    // IDの配列だとプログラミングが大変そうなので、オブジェクトの配列に変換します
    (() => {
        // プロパティを変換する関数
        const convertIdsPropertyToObjectsProperty = (object, oldName, newName, collection) => {
            if (!object[oldName]) {
                return;
            }

            // 新しいプロパティを作成します
            object[newName] = object[oldName].map(id => collection.find(x => x.id === id));

            // 古いプロパティを削除します
            delete object[oldName];
        };

        // taskのプロパティを変換します
        for (const task of question.tasks) {
            convertIdsPropertyToObjectsProperty(task, 'skillIds',       'skills',       question.skills);
            convertIdsPropertyToObjectsProperty(task, 'childIds',       'children',     question.tasks );
            convertIdsPropertyToObjectsProperty(task, 'predecessorIds', 'predecessors', question.tasks );
        }

        // memberのプロパティを変換します
        for (const member of question.members) {
            convertIdsPropertyToObjectsProperty(member, 'skillIds', 'skills', question.skills);
        }
    })();

    // 先行タスクが階層の親だとプログラミングが大変そうなので、末端のタスク同士の関係に変換します
    (() => {
        // 全ての先祖（親とその親とその親と……）を取得する関数
        const getAncestors = task => {
            const parents = question.tasks.filter(parent => parent.children && parent.children.includes(task));

            return parents.concat(parents.flatMap(getAncestors));
        };

        // 全ての子孫（子とその子とその子と……）を取得する関数
        const getDescendants = task => {
            const children = task.children || [];

            return children.concat(children.flatMap(getDescendants));
        };

        // 末端（子供がいない）かどうかを判定する関数
        const isLeaf = task => getDescendants(task).length == 0;

        // 末端の先行タスクのSetを取得する関数
        const getLeafPredecessorSet = task => {
            let result;

            // 自分自身と先行タスクに、親とその親とその親……の先行タスクを加えます
            result = (task.predecessors || []).concat(getAncestors(task).flatMap(ancestor => ancestor.predecessors || []));

            // 先行タスクに、子とその子とそこ子……を加えます
            result = result.concat(result.flatMap(getDescendants));

            // 末端（durationが設定されている）だけにフィルターします
            result = result.filter(isLeaf);

            return new Set(result);
        };

        // 末端の先行タスクのSetの集合を生成します
        const leafPredecessorSetMap = new Map(question.tasks.map(task => [task.id, getLeafPredecessorSet(task)]));

        // 末端のタスク同士の関係に整理された、末端のタスクだけをtasksに設定します
        question.tasks = question.tasks.filter(isLeaf).map(task => {
            const predecessorSet = new Set(leafPredecessorSetMap.get(task.id));

            // 先行タスクの先行タスクを除外します
            for (const predecessor of leafPredecessorSetMap.get(task.id)) {
                for (const predecessorPredecessor of leafPredecessorSetMap.get(predecessor.id)) {
                    predecessorSet.delete(predecessorPredecessor);
                }
            }

            // 末端のタスク同士の関係を再設定します
            task.predecessors = Array.from(predecessorSet);

            return task;
        });
    })();

    return question;
}

export function writeAnswer(answer, fd) {
    fs.writeFileSync(fd, JSON.stringify(answer.map(taskSchedule => ({taskId: taskSchedule.task.id, memberId: taskSchedule.member.id, startDay: taskSchedule.startDay, endDay: taskSchedule.endDay}))));
}
