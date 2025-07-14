import numpy as np
from sklearn.cluster import KMeans

NUM_CLUSTERS = 2

def predictHotZones(shotHistory):
    if len(shotHistory) <= NUM_CLUSTERS:
        return []
    try:
        data = np.array([[shot['x'], shot['y']] for shot in shotHistory])
        kmeans = KMeans(n_clusters=NUM_CLUSTERS, n_init='auto', random_state=42)
        kmeans.fit(data)
        hotZones = kmeans.cluster_centers_.tolist()
        return hotZones
    except Exception as e:
        print(f"MODEL ERROR: {e}")
        return []