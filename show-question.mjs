import fs  from 'fs';
import ejs from 'ejs';

function readQuestion(questionText) {
    const question = JSON.parse(questionText);

    const getAncestors = task => {
        const parents = question.tasks.filter(parent => parent.childIds && parent.childIds.includes(task.id));

        return parents.concat(parents.flatMap(getAncestors));
    };

    const getDescendants = task => {
        const children = task.childIds ? question.tasks.filter(child => task.childIds.includes(child.id)) : [];

        return children.concat(children.flatMap(getDescendants));
    };

    const isLeaf = task => getDescendants(task).length == 0;
    const isNode = task => !isLeaf(task);

    const getPredecessors = task => {
        let result;

        result = (task.predecessorIds || []).concat(getAncestors(task).flatMap(ancestor => ancestor.predecessorIds || [])).flatMap(predecessorId => question.tasks.find(task => task.id === predecessorId));
        result = result.concat(result.flatMap(getDescendants));

        return Array.from(new Set(result));
    };

    const setStartAndEndDayToLeaf = task => {
        if (!isLeaf(task)) {
            return;
        }

        const predecessors = getPredecessors(task).filter(isLeaf);

        for (const predecessor of predecessors) {
            if (!predecessor.startDay) {
                setStartAndEndDayToLeaf(predecessor);
            }
        }

        task.startDay = predecessors.length > 0 ? Math.max(...predecessors.map(predecessor => predecessor.endDay + 1)) : 0;
        task.endDay   = task.startDay + task.duration - 1;
    };

    const setStartAndEndDayToNode = task => {
        if (!isNode(task)) {
            return;
        }

        const descendants = getDescendants(task).filter(isLeaf);

        task.startDay = descendants.length > 0 ? Math.min(...descendants.map(descendant => descendant.startDay)) : -1;
        task.endDay   = descendants.length > 0 ? Math.max(...descendants.map(descendant => descendant.endDay  )) : -1;
    };

    for (const task of question.tasks) {
        setStartAndEndDayToLeaf(task);
    }

    for (const task of question.tasks) {
        setStartAndEndDayToNode(task);
    }

    return question;
}

fs.writeFileSync(process.stdout.fd, ejs.render(fs.readFileSync('./chart.ejs', 'utf-8'), readQuestion(fs.readFileSync(process.argv[2]))));
