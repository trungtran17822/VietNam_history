/**
 * engine.js - Rule-based deterministic calculation engine for historical simulations.
 * Guarantees that identical tactical choices always yield identical results.
 * Fully transparent: all calculations derive directly from coefficients declared in lesson data.
 */

(function (window) {
  'use strict';

  const SimulationEngine = {
    /**
     * Compute simulation outcome metrics based on baseline + student choices
     * @param {Object} lessonData - Parsed lesson object
     * @param {Object} choices - Key-value pair of { variableId: optionId }
     * @returns {Object} Calculated comparison results
     */
    calculate(lessonData, choices = {}) {
      if (!lessonData) {
        throw new Error('Dữ liệu bài học không hợp lệ.');
      }

      const baseline = lessonData.baseline || {
        durationHours: 36,
        casualties: 1800,
        positionScore: 95,
        ratingText: 'Chuẩn mực thần tốc'
      };

      const questionObj = lessonData.question || {};
      const variables = questionObj.variables || [];

      let timeDelta = 0;
      let casualtyDelta = 0;
      let scoreDelta = 0;

      const appliedAssumptions = [];
      const choiceDetails = [];
      let isIdenticalToOriginal = true;

      variables.forEach((variable) => {
        const chosenId = choices[variable.id];
        const option = (variable.options && variable.options.find((opt) => opt.id === chosenId)) || (variable.options && variable.options[0]) || {
          id: 'default',
          name: 'Mặc định',
          isOriginal: true,
          timeDelta: 0,
          casualtyDelta: 0,
          positionScoreDelta: 0
        };

        if (!option.isOriginal) {
          isIdenticalToOriginal = false;
        }

        timeDelta += option.timeDelta || 0;
        casualtyDelta += option.casualtyDelta || 0;
        scoreDelta += option.positionScoreDelta || 0;

        choiceDetails.push({
          variableId: variable.id,
          variableTitle: variable.title,
          optionId: option.id,
          optionName: option.name,
          shortName: option.shortName || option.name,
          isOriginal: !!option.isOriginal,
          timeDelta: option.timeDelta || 0,
          casualtyDelta: option.casualtyDelta || 0,
          scoreDelta: option.positionScoreDelta || 0,
          assumptions: option.assumptions || ''
        });

        appliedAssumptions.push({
          variable: variable.title,
          choice: option.name,
          isOriginal: !!option.isOriginal,
          timeDelta: option.timeDelta || 0,
          casualtyDelta: option.casualtyDelta || 0,
          scoreDelta: option.positionScoreDelta || 0,
          explanation: option.assumptions || ''
        });
      });

      // Compute final bounded figures
      const originalDuration = baseline.durationHours;
      const originalCasualties = baseline.casualties || 0;
      const originalScore = baseline.positionScore || 80;

      const studentDuration = Math.max(0, originalDuration + timeDelta);
      const studentCasualties = Math.max(0, originalCasualties + casualtyDelta);
      const studentScore = Math.max(10, Math.min(100, originalScore + scoreDelta));

      let outcomeSummary = '';
      let outcomeTone = 'encouraging';

      if (isIdenticalToOriginal) {
        outcomeSummary = baseline.ratingText
          ? `Tái hiện phương án lịch sử: ${baseline.ratingText}.`
          : 'Tái hiện chuẩn xác phương án lịch sử gốc.';
        outcomeTone = 'perfect';
      } else if (studentScore >= 75) {
        outcomeSummary = 'Phương án đạt hiệu quả cao, đạt các mục tiêu trọng tâm nhưng có sự thay đổi về chỉ số so với lịch sử.';
        outcomeTone = 'positive';
      } else if (studentScore >= 55) {
        outcomeSummary = 'Phương án có điểm khả thi nhưng còn hạn chế, các chỉ số có sự chênh lệch đáng kể so với phương án gốc.';
        outcomeTone = 'moderate';
      } else {
        outcomeSummary = 'Phương án đối mặt nhiều khó khăn; các chỉ số biến động bất lợi so với phương án lịch sử gốc.';
        outcomeTone = 'challenging';
      }

      return {
        isIdenticalToOriginal,
        original: {
          durationHours: originalDuration,
          casualties: originalCasualties,
          positionScore: originalScore,
          ratingText: baseline.ratingText
        },
        student: {
          durationHours: studentDuration,
          casualties: studentCasualties,
          positionScore: studentScore,
          timeDelta,
          casualtyDelta,
          scoreDelta,
          outcomeSummary,
          outcomeTone
        },
        choiceDetails,
        appliedAssumptions
      };
    },

    /**
     * Build contextual explanation for the chosen combination
     * @param {Object} lessonData
     * @param {Object} choices
     * @returns {Object} Explanation structure
     */
    generateExplanation(lessonData, choices = {}) {
      const explanations = (lessonData && lessonData.explanations) || {};
      const feedbacks = explanations.variableFeedbacks || {};
      const variablePoints = [];

      Object.keys(choices).forEach((varKey) => {
        const optKey = choices[varKey];
        if (feedbacks[varKey] && feedbacks[varKey][optKey]) {
          variablePoints.push({
            variableId: varKey,
            optionId: optKey,
            text: feedbacks[varKey][optKey]
          });
        }
      });

      return {
        intro: explanations.intro || 'Rất đáng khen cho tinh thần tìm tòi, tư duy phản biện và sáng tạo của các em.',
        variablePoints,
        encouragement:
          explanations.encouragingConclusion ||
          'Hãy tiếp tục khám phá và suy ngẫm về những bài học lịch sử quý giá qua từng thời kỳ phát triển!'
      };
    }
  };

  window.SimulationEngine = SimulationEngine;
})(window);
