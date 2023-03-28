// The reward amount is determine by few parameters:
// The positive votes proportion, the task difficulty, the amount of votes and an adjustment made by the authorized taskers
// Larger the amount of vote is compared to the positive vote proportion -> higher the reward is
// More people voted for a certain difficulty, more the reward approach to the BASE_DIFFICULTY_REWARD
// Here is the BASE_DIFFICULTY_REWARD per difficulty: 1 -> 120, 2 -> 360, 3 -> 720, 4 -> 1620, 5 -> 4900

const computeBaseReward = (DIFFICULTY) => {
    switch(DIFFICULTY) {
        case 1: // 3 max
            return 120
        case 2: // 5 max
            return 360
        case 3: // 8 max
            return 720
        case 4: // 15 max
            return 1620
        case 5: // 30 max
            return 4900
        default:
            return 0
    }
}

const countFrequency = (diff, votes) => {
    let count = 0;

    votes.forEach((vote) => {
        if (Number(vote.missionDifficulty) === diff) {
            count++;
        }
    });

    return count;
}

const computeVariance = (freqMap, maxFreq) => {
    return freqMap.map((value) => Math.pow(value.freq - maxFreq, 2)).reduce((a, b) => a + b) / freqMap.length;
}


const computeDifficultySpread = (votes, DIFFICULTY) => {
    const freqMap = []

    for (let i = 1; i <= 5; ++i) {
        freqMap.push({difficulty: i, freq: countFrequency(i, votes)})
    }

    //const freqSum = freqMap.map((object) => object.freq).reduce((accumulator, currentValue) => accumulator + currentValue)

    return Math.abs(Math.log10(computeVariance(freqMap, freqMap[freqMap.findIndex((item) => item.difficulty === DIFFICULTY)].freq)))
}

const computeVotePercentage = (votes) => {
    if (votes?.length > 0) {
        let score = 0
        votes.map((vote) => {
            if (vote.mission_relevance) {
                score++
            }
        })
        const percentage =  Math.round((score/votes.length)*100)
        return {yes: percentage, no: 100-percentage}
    } else {
        return {yes: 0, no: 100}
    }
}

export function roundUpOrDown(n) {
    const decimal = n % 1;
    if (decimal > 0.5) {
        return Math.ceil(n);
    } else {
        return Math.floor(n);
    }
}

const computeDifficulty = (votes) => {
    if (votes?.length > 0) {
        let diffSum = 0
        let buff = []
        votes.map((vote) => {
            if (vote.missionDifficulty) {
                diffSum+=Number(vote.missionDifficulty)
                buff.push(".")
            }
        })
        return roundUpOrDown(diffSum/buff.length)
    }
    return null
}

export const computeReward = (votes) => {
    return (computeVotePercentage(votes).yes / 50) * computeBaseReward(computeDifficulty(votes)) * computeDifficultySpread(votes, computeDifficulty(votes))
}