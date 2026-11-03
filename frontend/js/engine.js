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
      const originalCasualties = baseline.casualties;
      const originalScore = baseline.positionScore;

      const studentDuration = Math.max(12, originalDuration + timeDelta);
      const studentCasualties = Math.max(500, originalCasualties + casualtyDelta);
      const studentScore = Math.max(10, Math.min(100, originalScore + scoreDelta));

      let outcomeSummary = '';
      let outcomeTone = 'encouraging';

      if (isIdenticalToOriginal) {
        outcomeSummary = 'Tái hiện chuẩn xác 100% chiến lược thần tốc của vua Quang Trung mùa xuân 1789.';
        outcomeTone = 'perfect';
      } else if (studentScore >= 75) {
        outcomeSummary = 'Kế sách quyết liệt, giành thắng lợi chiến dịch nhưng trả giá thêm về thời gian và quân số.';
        outcomeTone = 'positive';
      } else if (studentScore >= 55) {
        outcomeSummary = 'Chiến trận giằng co; đồn lũy bị triệt hạ nhưng quân Thanh có cơ hội phản kích cầm cự.';
        outcomeTone = 'moderate';
      } else {
        outcomeSummary = 'Thế trận mất đi yếu tố thần tốc bất ngờ; nguy cơ bị quân Thanh ở Thăng Long phản công gọng kìm.';
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
        intro: explanations.intro || 'Chào các sĩ tử tương lai! Rất đáng khen cho tinh thần tìm tòi sáng tạo của các con.',
        variablePoints,
        encouragement:
          explanations.encouragingConclusion ||
          'Hãy tiếp tục khám phá và suy ngẫm về những bài học quý giá từ nghệ thuật quân sự của cha ông!'
      };
    }
  };

  window.SimulationEngine = SimulationEngine;
})(window);
