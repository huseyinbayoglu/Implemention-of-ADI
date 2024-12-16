import numpy as np 
import random,copy
from tensorflow.keras.utils import to_categorical
import tensorflow as tf 

class Cube():
    actions = ['up', 'up_c', 'down', 'down_c', 'left', 'left_c', 'right', 'right_c',
                        'front', 'front_c', 'back', 'back_c']
    action_space = len(actions)
    def __init__(self) -> None:
        self.state = np.arange(0, 27).reshape(3, 3, 3)
        self.actions = ['up', 'up_c', 'down', 'down_c', 'left', 'left_c', 'right', 'right_c',
                        'front', 'front_c', 'back', 'back_c']
        self.action_space = len(self.actions)
        self.rewards = {
            "Win":1,
            "Not Done":-1
        }

    @staticmethod
    def one_hot_state(state:np.array)->np.array:
        """
        state : Cube state (27,)
        RETURNS: np.array (27*27,) representing the one-hot encoded state
        """
        one_hot = to_categorical(state, num_classes=27)
        return one_hot

    @staticmethod
    def one_hot_to_state(one_hot: np.array) -> np.array:
        """
        one_hot : flatten array (27*27,)
        """
        state = np.argmax(one_hot.reshape(-1, 27), axis=1).reshape(3, 3, 3)
        return state

    def get_state(self):
        return copy.deepcopy(self.state)

    def right(self):
        self.state[:,:,2] = np.rot90(self.state[:,:,2], 1)
        return copy.deepcopy(self.state)
    
    def right_c(self):
        self.state[:,:,2] = np.rot90(self.state[:,:,2], 3)
        return copy.deepcopy(self.state)

    def left(self):
        self.state[:,:,0] = np.rot90(self.state[:,:,0], -1)
        return copy.deepcopy(self.state)
    
    def left_c(self):
        self.state[:,:,0] = np.rot90(self.state[:,:,0], 1)
        return copy.deepcopy(self.state)

    def front(self):
        self.state[0] = np.rot90(self.state[0], 3)
        return copy.deepcopy(self.state)
    
    def front_c(self):
        self.state[0] = np.rot90(self.state[0],1)
        return copy.deepcopy(self.state)

    def back(self):
        self.state[2] = np.rot90(self.state[2], 1)
        return copy.deepcopy(self.state)
    
    def back_c(self):
        self.state[2] = np.rot90(self.state[2], 3)
        return copy.deepcopy(self.state)
    
    def up(self):
        self.state[:,0] = np.rot90(self.state[:,0,:], 1)
        return copy.deepcopy(self.state)
    
    def up_c(self):
        self.state[:,0] = np.rot90(self.state[:,0,:], 3)
        return copy.deepcopy(self.state)

    def down(self):
        self.state[:,2,:] = np.rot90(self.state[:,2,:], 3)
        return copy.deepcopy(self.state)
    
    def down_c(self):
        self.state[:,2,:] = np.rot90(self.state[:,2,:], 1)
        return copy.deepcopy(self.state)
    
    def shuffle(self, n:int,verbose=False):
        actions = []
        for i in range(n):
            action = random.choice(self.actions)
            actions.append(action)
            getattr(self, action)()
        if verbose:
            return actions
    
    def step(self, action):
        getattr(self, action)()
        if self.is_solved():
            return self.get_state(), self.rewards["Win"], True # Next_state, reward, done
        else:
            return self.get_state(), self.rewards["Not Done"], False # Next_state, reward, done
    
    def set_state(self,state):
        self.state = copy.deepcopy(state)

    def is_solved(self)->bool:
        return np.all(self.get_state() == np.arange(0, 27).reshape(3, 3, 3))
    
    def reset(self,state :np.array = None):
        self.state = np.arange(0, 27).reshape(3, 3, 3)
        if state is not None:
            self.set_state(state)
        return self.get_state()

    def get_childs(self):
        """
        RETURNS: np.array (12,729) representing the child states and 
        np.array (12,1) representing the rewards
        """
        childs = np.zeros((12, 729))
        rewards = np.zeros((12, 1))
        for i, action in enumerate(self.actions):
            cube = Cube()
            cube.set_state(self.get_state())
            childs_,rewards_,_ = cube.step(action)
            childs[i] = preprocess_state(childs_)
            rewards[i] = rewards_
        return childs, rewards
    
    def __repr__(self) -> str:
        return str(self.state)
    def __str__(self) -> str:
        return str(self.state)
    def __eq__(self, other):
        return np.all(self.state == other.state)  
    def __ne__(self, other):
        return not np.all(self.state == other.state)

def preprocess_state(state:np.array):
    """
    state : np.array (3,3,3) representing the cube state
    RETURNS: np.array (729,) representing the one-hot encoded state
    """
    state_encoded = Cube.one_hot_state(np.copy(state).flatten()) # New shape is (3,3,3,27)
    # Flatten the state
    state_encoded = state_encoded.flatten() # New shape is (729,)
    return state_encoded

if __name__ == "__main__":
    cube = Cube()
    import time
    a = time.time()
    childs, rewards = cube.get_childs()
    print(f"Time ended: {(time.time()-a)}")

    b = time.time()
    childs2 = []
    rewards2 = []
    for action in cube.actions:
        cube2 = Cube()
        cube2.set_state(cube.get_state())

        child_state,reward,done = cube2.step(action)
        childs2.append(preprocess_state(child_state))
        rewards2.append(reward)
    print(f"Time ended: {(time.time()-b)}")

    print(np.all(childs == childs))


      