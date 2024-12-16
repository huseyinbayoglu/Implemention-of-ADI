from env import Cube, preprocess_state
import numpy as np 
import time 
from tqdm import tqdm
import pandas as pd 
from model import build_model
from tensorflow.keras.utils import to_categorical
import os 

class ADI():
    def __init__(self, env: Cube, K=2, l=2, model=None, M=1):
        self.env :Cube = env
        self.K :int = K  # Number of cubes
        self.l :int = l  # Max sequence length (will produce states from 1 to l moves away)
        self.N :int = self.K * self.l
        self.M :int = M
        
        self.model = build_model() if model is None else model
    
    def get_N_states(self):
        """
        Returns np.array of N states.
        """
        states = []
        steps = []
        for _ in range(self.K):
            cube = Cube()
            for step in range(1,self.l+1):
                move = np.random.choice(cube.actions)
                # move = "up_c"
                state, _, _ = cube.step(move)
                states.append(state) # Do not preprocess it because it will be used in "set_state" method.
                steps.append(step)
        return np.stack(states), 1/np.array(steps)
    
    def get_N_states2(self):
        """
        Returns np.array of N states.
        """
        states = [np.arange(0,27).reshape(3,3,3)]
        steps = [1]
        for _ in range(self.K):
            cube = Cube()
            for step in range(1,self.l+1):
                move = np.random.choice(cube.actions)
                # move = "up_c"
                state, _, _ = cube.step(move)
                states.append(state) # Do not preprocess it because it will be used in "set_state" method.
                steps.append(step+1)
        return np.stack(states), 1/np.array(steps)
    


    def trainADI(self, iterations=None):
        if iterations is None:
            iterations = self.M

        # Dataframe to store training history
        dfs = []


        # Start training
        for iteration in range(iterations):
            X,weighted_samples = self.get_N_states()
            ##################################################################################################
            ##################################################################################################
            childs = np.zeros(shape=(X.shape[0]*12,729))
            rewards = np.zeros(shape=(X.shape[0]*12,1))


            for idx,x_i in enumerate(X):
                cube = Cube()
                cube.set_state(x_i)
                childs[idx*12:(idx+1)*12], rewards[idx*12:(idx+1)*12] = cube.get_childs()

            _,v_x_i = self.model.predict(childs,verbose = False) # v_x_i shape: (12,1) p_x_i shape: (12,12)
            combination = rewards + v_x_i
            combination = combination.reshape(X.shape[0],12)
            label_value = np.max(combination,axis=1)
            # print(f"Value hazırlanıyor. Combination shape: {combination.shape} label_value shape: {label_value.shape} rewards shape: {rewards.shape} v_x_i shape: {v_x_i.shape}")
            # print(f"rewards: {rewards.T}")
            # print(f"v_x_i: {v_x_i.T}")
            # print(f"Combination:\n {combination}")
            # print(f"Label value: {label_value}")
            label_policy = to_categorical(np.argmax(combination,axis=1), num_classes=12)
            # print(f"Label : {cube.actions[np.argmax(combination[0])]}")

            X_preprocessed = np.array([preprocess_state(x) for x in X])
            X = X_preprocessed


            ##################################################################################################
            # Controlling the label of the solved state
            solved_preprocced = preprocess_state(np.arange(0,27).reshape(3,3,3))
            matched = np.where(np.all(X == solved_preprocced,axis=1))[0]
            label_value[matched] = 0

            # Update weighted sample
            # weighted_samples[matched] = 18




            ##################################################################################################
            ##################################################################################################
            print(f"iteration: {iteration}")


            # solved_state = np.arange(0,27).reshape(3,3,3)
            # one_move_childs,_ = Cube().get_childs()
            # one_move_values = self.model.predict(one_move_childs,verbose = 0)[1]
            
            # Finding child label indices
            # child_indices = []
            # for i in range(12):
                # child_indices.append(np.where(np.all(X == one_move_childs[i],axis=1))[0][0])

            # one_move_labels = label_value[child_indices]

            # print(f"Model eğitimi öncesi solved state value tahmini: {self.model.predict(np.expand_dims(preprocess_state(solved_state),axis=0),verbose = 0)[1]}")
            # print(f"Solved state value label: {label_value[matched[0]]}")
            # print(f"Model eğitimi öncesi one move child value tahminleri: {one_move_values.T}")
            # print(f"One move child value label: {one_move_labels}")

            history = self.model.fit(X, (label_policy,label_value), batch_size=64, sample_weight=weighted_samples, verbose=1)
            # print(f"Model eğitimi sonrası one move child value tahminleri: {self.model.predict(one_move_childs,verbose = 0)[1].T}")
            # print(f"Model eğitimi sonrası solved state value tahmini: {self.model.predict(np.expand_dims(preprocess_state(solved_state),axis=0),verbose = 0)[1]}",end="\n\n"*3)

            df = pd.DataFrame(history.history)
            dfs.append(df)
            # Decay learning rate as in your original code
            new_lr = max(self.model.optimizer.learning_rate.numpy() * 0.96, 1e-8)
            self.model.optimizer.learning_rate.assign(new_lr)
            if iteration == iterations-1:
                print(f"lr: {round(self.model.optimizer.learning_rate.numpy(),8)}")
            # print(f"after training lr: {round(self.model.optimizer.learning_rate.numpy(),8)}",end="\n\n")
            self.model.save("Models/model2.keras")
        return pd.concat(dfs)
    


if __name__ == "__main__": 
    env = Cube()
    model = build_model()
    # model.optimizer.learning_rate.assign(5e-7)
    # model.load_weights("Models/extracted2/model.weights.h5")

    # Start small: l=1 means states are always just 1 move away from solved.
    # The BFS will always find a solved child -> strong positive signal.
    cubes = 100
    length = 30
    iterations = 100

    adi = ADI(env, K=cubes, l=length, M=iterations, model=model)
    now = time.time()
    df = adi.trainADI(iterations)
    elapsed = time.time() - now
    print(f"Elapsed time: {elapsed} seconds.") # Elapsed time: 12.341301918029785 seconds.
    print("Training complete. Now you can try increasing l gradually and retrain.")
    df.to_csv("Results.csv", index=False)
