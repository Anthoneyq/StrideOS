# Stride OS: Machine Learning Prediction Models & Architecture
## Technical Engineering Guide: Designing, Training, and Deploying a Performance Intelligence Engine
*Author: Manus AI*  
*Date: May 26, 2026*

---

## 1. Executive Summary

This guide outlines the technical blueprint for the **Stride OS Machine Learning (ML) Engine**. While traditional running applications rely on static, population-averaged formulas like the Riegel or Daniels models, Stride OS utilizes a dynamic, data-driven machine learning architecture. By combining **Gradient Boosted Trees (XGBoost/LightGBM)** for tabular feature extraction, **Long Short-Term Memory (LSTM) Networks** for sequence-to-sequence training log modeling, and **Bayesian Updating** for personalized, small-sample adaptation, Stride OS delivers highly accurate, individualized, and explainable performance predictions. This document details the exact mathematical models, feature engineering pipelines, cold-start mitigation strategies, and production MLOps architecture required to build a world-class athletic intelligence platform.

---

## 2. Machine Learning Architecture Overview

To balance prediction accuracy, computational efficiency, and personalization, the Stride OS ML Engine is structured as a **hybrid multi-model system**. Instead of a single "master model," Stride OS deploys three specialized model tiers that handle different stages of the athlete's data lifecycle.

```
                  ┌─────────────────────────────────────────┐
                  │          ATHLETE DATA INGESTION         │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
       ┌─────────────────────────────────────────────────────────────────┐
       │                       MODEL ROUTING ENGINE                      │
       └───────┬───────────────────────┼─────────────────────────┬───────┘
               │                       │                         │
               │ [0 - 3 Runs]          │ [4 - 15 Runs]           │ [> 15 Runs]
               ▼                       ▼                         ▼
   ┌───────────────────────┐ ┌───────────────────────┐ ┌───────────────────────┐
   │        TIER 1         │ │        TIER 2         │ │        TIER 3         │
   │   Bayesian-Adjusted   │ │   Gradient Boosting   │ │  Sequence-to-Seq LST  │
   │     Physiology        │ │   (XGBoost/LightGBM)  │ │   Recurrent Network   │
   └───────────────────────┘ └───────────────────────┘ └───────────────────────┘
```

### 2.1 The Three-Tier Model Hierarchy

#### Tier 1: Bayesian-Adjusted Physiological Model (Cold-Start & Small-Sample)
*   **Target Audience:** New users with $0$ to $3$ logged runs.
*   **Methodology:** Combines population-wide physiological priors (e.g., standard VDOT, Riegel, and age-graded curves) with a Bayesian updating framework [1]. As the runner logs their first few runs, the model updates its belief of their individual fatigue exponent ($\alpha$) and running economy ($RE$) without overfitting.
*   **Benefit:** Zero-delay utility; eliminates the "cold-start" barrier typical of machine learning platforms.

#### Tier 2: Gradient Boosted Trees (XGBoost / LightGBM)
*   **Target Audience:** Mid-stage users with $4$ to $15$ logged runs.
*   **Methodology:** Utilizes tabular feature extraction across aggregated training blocks (e.g., 30-day and 90-day rolling metrics) [2]. Tree-based ensemble methods are exceptionally robust to missing data (such as missing heart rate or temperature metrics) and automatically capture non-linear interactions between training volume, intensity distribution, and performance.
*   **Benefit:** High interpretability via SHAP (SHapley Additive exPlanations) values, allowing the app to explain exactly *why* a prediction was made.

#### Tier 3: Sequence-to-Sequence Recurrent Neural Networks (LSTM)
*   **Target Audience:** Advanced users with $> 15$ historical runs or structured race logs [3].
*   **Methodology:** Models the runner's training log as a multivariate time series. The input is a sequence of daily training vectors (distance, elevation, intensity, recovery metrics), and the output is a predicted time for a target race distance.
*   **Benefit:** Captures the cumulative, time-dependent effects of training (e.g., acute fatigue decay and chronic fitness adaptation), mirroring the physiological Banister model but with deep learning accuracy.

---

## 3. Tier 1: Bayesian Updating & Cold-Start Mitigation

When a new athlete registers on Stride OS, the platform faces a "cold-start" problem: there is no historical training data to train a personalized machine learning model. Tier 1 solves this by establishing a **Prior Probability Distribution** based on population data, which is then updated incrementally using **Bayes' Theorem** as the athlete logs their first few runs.

### 3.1 Establishing the Physiological Prior

The system initializes the athlete's profile using three easily accessible demographic inputs: Age ($A$), Biological Sex ($S$), and a self-reported recent race or time-trial performance ($T_{\text{prior}}$ at distance $D_{\text{prior}}$).

1.  **Prior VDOT ($\mu_{\text{vdot}}$):** Calculated using the Daniels-Gilbert formula (Appendix H.1 of the supplementary report) from the self-reported time.
2.  **Prior Fatigue Exponent ($\mu_{\alpha}$):** Initialized to the standard Riegel exponent of $1.06$ [4].
3.  **Prior Variance ($\sigma^2$):** Set based on population variance for the athlete's age and sex category.
    $$\text{Prior Distribution: } P(\theta) \sim \mathcal{N}(\mu_{\text{prior}}, \sigma^2_{\text{prior}})$$
    $$\text{Where } \theta = \{\text{VDOT}, \alpha\}$$

### 3.2 Incremental Bayesian Updating

As the athlete records new runs, Stride OS observes their actual pace ($v_{\text{obs}}$) and heart rate ($HR_{\text{obs}}$) at a given distance ($D_{\text{obs}}$). The likelihood of observing these metrics given the prior parameters is modeled as:
$$P(\text{Data} \mid \theta) \sim \mathcal{N}(f(\theta, D_{\text{obs}}), \sigma^2_{\text{obs}})$$
$$\text{Where } f(\theta, D_{\text{obs}}) \text{ is the predicted pace based on the Riegel/VDOT hybrid model.}$$

Using Bayes' Theorem, the **Posterior Distribution** (our updated belief of the athlete's true fitness parameters) is calculated as [1]:
$$P(\theta \mid \text{Data}) = \frac{P(\text{Data} \mid \theta) P(\theta)}{P(\text{Data})}$$

For a conjugate normal distribution with a known observation variance $\sigma^2$, the posterior mean ($\mu_{\text{post}}$) and variance ($\sigma^2_{\text{post}}$) after observing a new run are calculated analytically:

$$\mu_{\text{post}} = \frac{\sigma^2_{\text{obs}} \mu_{\text{prior}} + \sigma^2_{\text{prior}} x_{\text{obs}}}{\sigma^2_{\text{prior}} + \sigma^2_{\text{obs}}}$$

$$\sigma^2_{\text{post}} = \frac{\sigma^2_{\text{prior}} \sigma^2_{\text{obs}}}{\sigma^2_{\text{prior}} + \sigma^2_{\text{obs}}}$$

*   *App Application:* This mathematical update runs asynchronously on the backend immediately after a new run is saved. Within 3 runs, the model's estimate of the runner's fatigue exponent ($\alpha$) shifts from the generic $1.06$ to their actual individual exponent (e.g., $1.04$ for highly aerobic runners, or $1.09$ for speed-dominant runners), dramatically improving early-stage prediction accuracy without requiring a massive dataset.

---

## 4. Tier 2: Gradient Boosting (XGBoost / LightGBM)

Once an athlete has logged $4$ to $15$ runs, the platform transitions to **Tier 2**. This model operates on tabular features engineered from the athlete's training history.

### 4.1 Tabular Feature Engineering Pipeline

The raw data ingested from wearables (GPS, heart rate, cadence) is processed through a feature extraction pipeline that generates rolling windows of **7, 30, and 90 days** prior to the prediction date.

| Feature Category | Feature Name | Mathematical Definition / Extraction Method | Physiological Significance |
| :--- | :--- | :--- | :--- |
| **Demographic** | `age_years` | $Date_{\text{prediction}} - DOB$ | Establishes physiological baseline decay |
| | `gender_bin` | $\text{Male} = 1, \text{Female} = 0$ | Scales VO2max and body composition priors |
| **Volume** | `weekly_vol_7d` | $\sum_{i=1}^{7} \text{Distance}_i$ | Measures acute training volume |
| | `chronic_vol_30d` | $\sum_{i=1}^{30} \text{Distance}_i$ | Measures chronic aerobic base development |
| | `vol_gradient` | $\frac{\text{weekly\_vol\_7d}}{\text{chronic\_vol\_30d} / 4.28}$ | Identifies rapid mileage increases (injury risk) |
| **Intensity** | `aerobic_ratio_30d` | $\frac{\text{Time in Zone 1 \& 2}}{\text{Total Training Time}}$ | Quantifies training polarization (80/20 compliance) [5] |
| | `threshold_ratio_30d` | $\frac{\text{Time in Zone 4}}{\text{Total Training Time}}$ | Quantifies lactate threshold development |
| | `mean_intensity_factor`| $\frac{1}{N} \sum IF_i$ | Measures average training intensity density |
| **Stress** | `mean_rtss_30d` | $\frac{1}{30} \sum rTSS_i$ | Average daily training stress score [6] |
| | `acwr_ewma` | $\frac{EWMA_{\text{acute}}(7d)}{EWMA_{\text{chronic}}(28d)}$ | Acute-to-Chronic Workload Ratio (Section 5.2) [7] |
| **Efficiency** | `aerobic_decoupling` | $\frac{Pa:HR_{\text{first\_half}} - Pa:HR_{\text{second\_half}}}{Pa:HR_{\text{first\_half}}}$ | Cardiac drift; measures aerobic efficiency [8] |
| | `mean_gct_imbalance` | $\frac{1}{N} \sum |GCT_{\text{left}} - GCT_{\text{right}}|$ | Ground Contact Time asymmetry; flags fatigue/injury |
| **Environmental**| `altitude_ft` | Median altitude of logged runs | Calibrates sea-level equivalent performance [9] |
| | `heat_index_mean` | Combined temperature and humidity vector | Adjusts for cardiovascular drift penalty |

### 4.2 Model Training & Optimization

The Tier 2 model utilizes **XGBoost (Extreme Gradient Boosting)** because of its speed, regularized objective function (which prevents overfitting on small datasets), and ability to handle missing features natively [2].

#### Objective Function with L1/L2 Regularization:
$$\mathcal{L}(\phi) = \sum_{i} l(\hat{y}_i, y_i) + \sum_{k} \Omega(f_k)$$
$$\text{Where } \Omega(f) = \gamma T + \frac{1}{2} \lambda \sum_{j=1}^{T} w_j^2$$
*   $l(\hat{y}_i, y_i)$ is the loss function (Mean Squared Error for race time prediction).
*   $T$ is the number of leaves in tree $f$.
*   $w$ is the vector of leaf weights.
*   $\gamma$ and $\lambda$ are regularization hyperparameters that penalize model complexity.

#### Hyperparameter Search Space (Bayesian Optimization):
*   `max_depth`: $[3, 4, 5, 6]$ (kept low to prevent overfitting)
*   `learning_rate`: $[0.01, 0.05, 0.1]$
*   `n_estimators`: $[100, 200, 500]$
*   `subsample`: $[0.7, 0.8, 0.9]$ (fraction of data sampled per tree)
*   `colsample_bytree`: $[0.7, 0.8, 0.9]$ (fraction of features sampled per tree)

---

## 5. Tier 3: Sequence-to-Sequence Recurrent Networks (LSTM)

For advanced runners with extensive logs ($> 15$ runs), Stride OS deploys **Tier 3**, a sequence-to-sequence Recurrent Neural Network utilizing **Long Short-Term Memory (LSTM)** cells. This model treats the athlete's training log as a multivariate time series, capturing the cumulative, non-linear effects of training adaptations and fatigue decay over time [3].

### 5.1 Mathematical Formulation of the LSTM Cell

A standard feedforward network treats training sessions as independent events. An LSTM network resolves this by passing a continuous **Cell State ($c_t$)** and **Hidden State ($h_t$)** across time steps, allowing the model to "remember" fitness built weeks ago and "forget" acute fatigue as the athlete tapers.

```
                    [ Input Vector x_t (Daily Training) ]
                                     │
                                     ▼
                ┌─────────────────────────────────────────┐
                │                LSTM CELL                │
                │                                         │
  [ Cell State ]│  Forget Gate:   f_t = σ(W_f·[h_t-1, x_t])│[ Updated Cell State ]
  ─── c_t-1 ───►│  Input Gate:    i_t = σ(W_i·[h_t-1, x_t])├────► c_t ──────────
                │  Candidate:    ~c_t = tanh(W_c·[h_t-1,x])│
                │  Output Gate:   o_t = σ(W_o·[h_t-1, x_t])│
                │  Hidden State:  h_t = o_t * tanh(c_t)   │
                └────────────────────┬────────────────────┘
                                     │
                                     ▼
                        [ Hidden State Output h_t ]
```

At each training day $t$, the LSTM cell ingests the input vector $x_t$ (containing daily distance, rTSS, sleep, and average heart rate) and updates its state using the following equations:

1.  **Forget Gate ($f_t$):** Controls how much historical training stress to discard.
    $$f_t = \sigma(W_f \cdot [h_{t-1}, x_t] + b_f)$$
2.  **Input Gate ($i_t$) & Candidate Cell State ($\tilde{c}_t$):** Decides what new training adaptations to store in the cell state.
    $$i_t = \sigma(W_i \cdot [h_{t-1}, x_t] + b_i)$$
    $$\tilde{c}_t = \tanh(W_c \cdot [h_{t-1}, x_t] + b_c)$$
3.  **Cell State Update ($c_t$):** Computes the new running fitness state.
    $$c_t = f_t * c_{t-1} + i_t * \tilde{c}_t$$
4.  **Output Gate ($o_t$) & Hidden State ($h_t$):** Determines the outputted performance capacity.
    $$o_t = \sigma(W_o \cdot [h_{t-1}, x_t] + b_o)$$
    $$h_t = o_t * \tanh(c_t)$$

*   *Physiological Alignment:* The cell state $c_t$ mathematically mirrors the chronic adaptation (fitness) term in the Banister model, while the hidden state $h_t$ reflects the immediate performance capacity after subtracting acute fatigue [10].

### 5.2 Network Architecture & Training Pipeline

The sequence-to-sequence architecture is designed to map a variable-length training window (typically $90$ days) to a single scalar output: predicted race time ($T_{\text{predicted}}$) for a target distance ($D_{\text{target}}$) and target elevation gain ($E_{\text{target}}$).

```
[ 90-Day Training Sequence (x_1, x_2, ..., x_90) ]
                      │
                      ▼
         ┌─────────────────────────┐
         │   Bi-directional LSTM   │  (64 units, Dropout = 0.2)
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │     Attention Layer     │  (Focuses on key long runs/workouts)
         └────────────┬────────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │   Fully Connected (FC)  │  (Concatenates Target Distance & Elevation)
         └────────────┬────────────┘
                      │
                      ▼
            [ Predicted Race Time ]
```

1.  **Sequence Layer:** Ingests a $90 \times M$ matrix, where $90$ is the training days and $M$ is the number of daily features.
2.  **Attention Layer:** Applies a softmax weight to the LSTM hidden states. This allows the network to place higher importance on critical workouts (e.g., a 20-mile long run on Day 70) and lower importance on rest days [3].
3.  **Concatenation Layer:** The output of the attention layer is concatenated with the static target parameters: Target Distance ($D_{\text{target}}$) and Target Elevation ($E_{\text{target}}$).
4.  **Dense Output Layer:** A fully connected layer with linear activation outputs the final predicted time in seconds.

---

## 6. Model Explainability & SHAP Integration

A key product principle of Stride OS is to avoid "black-box" predictions. When the app predicts a 3:45:00 marathon, it must explain to the coach and athlete *why* it arrived at that number and *how* to improve it. Stride OS achieves this by integrating **SHAP (SHapley Additive exPlanations)** values into the Tier 2 and Tier 3 models [2].

### 6.1 The Mathematics of SHAP

SHAP values are based on cooperative game theory. They calculate the marginal contribution of each training feature to the final prediction across all possible feature combinations.

The local explanation model $g(z')$ is defined as a linear function of coalitional values:
$$g(z') = \phi_0 + \sum_{i=1}^{M} \phi_i z'_i$$
$$\text{Where } z' \in \{0, 1\}^M \text{ represents the presence or absence of feature } i,$$
$$\text{and } \phi_i \text{ is the Shapley value (marginal contribution) of feature } i.$$

The Shapley value $\phi_i$ is calculated as:
$$\phi_i = \sum_{S \subseteq F \setminus \{i\}} \frac{|S|!(|F| - |S| - 1)!}{|F|!} \left[ f_x(S \cup \{i\}) - f_x(S) \right]$$
*   $F$ is the set of all features.
*   $S$ is a subset of features excluding feature $i$.
*   $f_x(S)$ is the model prediction using only the features in subset $S$.

### 6.2 Translating SHAP to User-Facing Insights

The raw SHAP values ($\phi_i$) are signed scalars representing seconds added or subtracted from the baseline prediction. Stride OS translates these values into actionable coaching advice.

```
                    [ Predicted Marathon: 3:45:00 ]
                       (Baseline: 4:02:00)
                                │
                                ▼
       ┌──────────────────────────────────────────────────┐
       │             SHAP CONTRIBUTION ANALYSIS           │
       └───────┬───────────────────┬──────────────────┬───┘
               │                   │                  │
               ▼                   ▼                  ▼
       [ Weekly Volume ]   [ Zone 2 Ratio ]    [ Decoupling ]
       -12 mins (Strong)   -7 mins (Strong)    +2 mins (Weak)
               │                   │                  │
               ▼                   ▼                  ▼
         "Keep it up!"       "Keep it up!"       "Focus here!"
```

#### The Insight Engine Algorithm:
1.  **Calculate Local SHAP Values:** Run SHAP on the athlete's current feature vector.
2.  **Sort by Absolute Impact:** Identify the top three negative (beneficial) features and top three positive (detrimental) features.
3.  **Generate Natural Language Copy:**
    *   *Example 1 (Negative SHAP - Strong Feature):* If `chronic_vol_30d` has a SHAP value of $-720\text{ seconds}$ (subtracting 12 minutes from race time), display: **"Your consistent mileage over the last 30 days is your greatest strength, shaving 12 minutes off your predicted time. Keep maintaining this base!"**
    *   *Example 2 (Positive SHAP - Weak Feature):* If `aerobic_decoupling` has a SHAP value of $+480\text{ seconds}$ (adding 8 minutes to race time due to high cardiac drift), display: **"Your heart rate rises rapidly during long runs, adding 8 minutes to your predicted time. Stride OS recommends focusing on Zone 2 aerobic endurance to improve cardiovascular efficiency."**

---

## 7. Model Confidence Intervals & Uncertainty Estimation

To prevent false precision, Stride OS must display predicted times as a **Confidence Range** (e.g., "3:42:15 to 3:48:45" with $90\%$ confidence) rather than a single static number. The width of this range reflects the quantity and quality of the athlete's logged data.

### 7.1 Quantile Regression

To generate calibrated uncertainty ranges, the Tier 2 Gradient Boosting model is trained using **Quantile Loss (Pinball Loss)** instead of standard Mean Squared Error [2].
$$\mathcal{L}_q(\hat{y}, y) = \max \left[ q(y - \hat{y}), (q - 1)(y - \hat{y}) \right]$$
$$\text{Where } q \text{ is the target quantile (e.g., } 0.05, 0.50, 0.95\text{).}$$

By training three separate model heads:
1.  **Lower Bound Model ($q = 0.05$):** Predicts the 5th percentile of finish times (the "best-case scenario").
2.  **Median Model ($q = 0.50$):** Predicts the 50th percentile (the most likely finish time).
3.  **Upper Bound Model ($q = 0.95$):** Predicts the 95th percentile (the "worst-case scenario").

### 7.2 Data Density Penalty

If an athlete has logged very few runs, the model's prediction uncertainty should naturally widen. Stride OS applies a **Data Density Penalty** to the confidence interval width based on the number of logged runs ($N$) in the last 90 days:

$$\text{Adjusted Interval Width} = \text{Interval}_{\text{quantile}} \times \left(1.0 + \frac{\beta}{\sqrt{N}}\right)$$
$$\text{Where } \beta \text{ is a scaling coefficient (typically } 1.5\text{).}$$

*   *Product Benefit:* An athlete with 4 logged runs will see a wide prediction window (e.g., "3:30:00 to 4:15:00"), visually conveying lower confidence. As they log more runs, the window narrows (e.g., "3:42:00 to 3:48:00"), rewarding consistent logging with precise, high-confidence feedback.

---

## 8. Production MLOps Architecture & Data Pipelines

To support thousands of concurrent athletes, the Stride OS ML Engine must be deployed as a highly scalable, event-driven MLOps architecture.

### 8.1 Production System Diagram

```
[ Garmin/COROS/Apple Watch ] ──(Webhook)──► [ API Gateway ]
                                                 │
                                                 ▼
                                        [ Ingestion Worker ]
                                                 │
                                                 ├─► [ Supabase DB ]
                                                 │
                                                 ▼
                                        [ Feature Pipeline ]
                                                 │
                                                 ▼
                                        [ Redis Feature Store ]
                                                 │
                  ┌──────────────────────────────┴──────────────────────────────┐
                  ▼                                                             ▼
       [ Real-Time Inference ]                                         [ Retraining Worker ]
     (Trained Models in S3 / ONNX)                                     (Weekly Batch on Ray)
                  │                                                             │
                  ▼                                                             ▼
     [ API Response to App UI ]                                        [ MLflow Model Registry ]
```

### 8.2 The Three Pipeline Components

#### 1. The Feature Pipeline (Real-Time & Batch)
*   **Trigger:** Executed via a webhook whenever a new activity is synced from Garmin, COROS, Apple Watch, or Strava.
*   **Process:**
    *   Ingests raw FIT/TCX files, extracts second-by-second pace, elevation, and heart rate.
    *   Calculates $NGP$, $IF$, and $rTSS$ (Section 5.1 of main report).
    *   Computes rolling 7, 30, and 90-day aggregations.
    *   Writes the resulting feature vectors to a **Redis Feature Store** for low-latency retrieval.

#### 2. The Inference Pipeline (Low-Latency)
*   **Trigger:** Executed when a user opens the Stride OS prediction dashboard.
*   **Process:**
    *   Retrieves the athlete's latest feature vector from the Redis Feature Store.
    *   Routes the request to the appropriate model tier based on the user's run count ($N$).
    *   Executes model inference using **ONNX Runtime** (which compiles PyTorch LSTMs and XGBoost models into highly optimized C++ runtimes, reducing inference latency to $< 10\text{ ms}$).
    *   Computes SHAP explanations and calibrated uncertainty ranges.
    *   Returns the JSON payload to the client app.

#### 3. The Retraining Pipeline (Asynchronous Batch)
*   **Trigger:** Scheduled weekly batch job (e.g., Sunday at 2:00 AM) or triggered when model drift is detected.
*   **Process:**
    *   Queries the Supabase database for new race results (ground-truth labels).
    *   Retrains the Tier 2 and Tier 3 models on the updated population dataset using **Ray** for distributed training.
    *   Evaluates model performance against the holdout validation set.
    *   If the new model out-performs the active model (lower Mean Absolute Error), it registers the model in the **MLflow Model Registry** and promotes it to production.

---

## 9. References

1.  Dwarfs on the Shoulders of Giants: "Bayesian Analysis with Informative Priors in Elite Sports Research and Decision Making." *Frontiers in Sports and Active Living*, 2022. [Frontiers: Bayesian Analysis in Elite Sports](https://www.frontiersin.org/journals/sports-and-active-living/articles/10.3389/fspor.2022.793603/full)
2.  Explainable Machine Learning Models to Predict Endurance of Athletes. *NHSJS*, November 2025. [NHSJS: Explainable ML Models for Endurance](https://nhsjs.com/2025/explainable-machine-learning-models-to-predict-endurance-of-athletes/)
3.  Dash, S. (2024). "Win Your Race Goal: A Generalized Approach to Prediction of Running Performance." *Sports Medicine International Open*, October 2024. [PMC: Win Your Race Goal](https://pmc.ncbi.nlm.nih.gov/articles/PMC11495242/)
4.  Riegel, P. (1977). "Time Predicting." *Runner's World*, August 1977. [RunnersConnect: Race Calculators](https://runnersconnect.net/race-calculators/)
5.  Stephen Seiler. (2013). "The 80/20 Polarized Training Model." *University of Agder*. [Springer: Personalized Training Models for Marathon Performance](https://www.nature.com/articles/s41598-025-25369-7)
6.  Coggan, A. (2006). "Running Training Stress Score (rTSS)." *TrainingPeaks*. [TrainingPeaks: rTSS Explained](https://www.trainingpeaks.com/learn/articles/running-training-stress-score-rtss-explained/)
7.  White, R., et al. (2020). "The Acute:Chronic Workload Ratio." *Science for Sport*. [Science for Sport: ACWR](https://www.scienceforsport.com/acutechronic-workload-ratio/)
8.  Cardiac Drift & Aerobic Decoupling. *TrainingPeaks*. [TrainingPeaks: The Science of the Performance Manager](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)
9.  Schwartz, T. (2011). "Altitude Adjustment Calculator." *Final Surge*. [Final Surge Altitude Conversion](https://www.finalsurge.com/altitude-conversion-calculator)
10. Banister, E. W., et al. (1975). "A systems model of training for athletic performance." *Australian Journal of Sports Medicine*. [TrainingPeaks: The Science of the Performance Manager](https://www.trainingpeaks.com/learn/articles/the-science-of-the-performance-manager/)
